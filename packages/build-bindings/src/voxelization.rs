use std::io::Read;

use obj::ObjData;
use wasm_bindgen::JsValue;

type Point = [f32; 3];
type Triangle = [Point; 3];
struct Ray {
    origin: Point,
    direction: [f32; 3],
}

impl Ray {
    fn intersect_triangle(&self, [v0, v1, v2]: Triangle) -> Option<Point> {
        let edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        let edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        let h = cross(self.direction, edge2);
        let a = dot(edge1, h);
        if a > -0.00001 && a < 0.00001 {
            return None;
        }
        let f = 1.0 / a;
        let s = [
            self.origin[0] - v0[0],
            self.origin[1] - v0[1],
            self.origin[2] - v0[2],
        ];
        let u = f * dot(s, h);
        if u < 0. || u > 1. {
            return None;
        }
        let q = cross(s, edge1);
        let v = f * dot(self.direction, q);
        if v < 0. || v > 1. {
            return None;
        }
        let t = f * dot(edge2, q);
        if t > 0.00001 {
            return Some([
                self.origin[0] + t * self.direction[0],
                self.origin[1] + t * self.direction[1],
                self.origin[2] + t * self.direction[2],
            ]);
        }

        None
    }
}

pub fn voxelize<B>(obj_buffer: B, scale: usize) -> Result<Vec<Vec<Vec<u8>>>, JsValue>
where
    B: Read,
{
    let obj = ObjData::load_buf(obj_buffer)
        .map_err(|err| format!("failed to load model : {}", err.to_string()))?;

    let mut triangles: Vec<Triangle> = obj
        .objects
        .iter()
        .map(|o| {
            o.groups
                .iter()
                .map(|g| {
                    g.polys
                        .iter()
                        .filter_map(|p| {
                            let v = &p.0;
                            if v.len() < 3 {
                                return None;
                            }
                            let mut tris = Vec::with_capacity(v.len());
                            let i0 = v[0].0;
                            for k in 1..v.len() - 1 {
                                tris.push([i0, v[k].0, v[k + 1].0]);
                            }
                            let tris: Vec<Triangle> = tris
                                .into_iter()
                                .map(|tri| tri.map(|i| obj.position[i]))
                                .collect();
                            Some(tris)
                        })
                        .flatten()
                })
                .flatten()
        })
        .flatten()
        .collect();

    // Compute the mins and maxs coordonate of the vertices
    let first = triangles.first().ok_or("The model contains no vertex")?;
    let first = (first[0][0], first[0][1], first[0][2]);
    let (mins, maxs) = triangles.iter().flatten().fold(
        (first, first),
        |((min_x, min_y, min_z), (max_x, max_y, max_z)), [curr_x, curr_y, curr_z]| {
            (
                (curr_x.min(min_x), curr_y.min(min_y), curr_z.min(min_z)),
                (curr_x.max(max_x), curr_y.max(max_y), curr_z.max(max_z)),
            )
        },
    );

    // First we translate the vertices so that the smallest coord point is in 0,0,0
    triangles.iter_mut().for_each(|triangle| {
        *triangle = triangle.map(|v| [v[0] - mins.0, v[1] - mins.1, v[2] - mins.2])
    });

    // Don't forget to substract that to the maxs we computed before to reflect the changes
    let maxs = (maxs.0 - mins.0, maxs.1 - mins.1, maxs.2 - mins.2);

    // Compute the global max
    let max = maxs.0.max(maxs.1.max(maxs.2));

    // Then scale the vertices
    triangles
        .iter_mut()
        .flatten()
        .for_each(|v| *v = v.map(|c| c / max * scale as f32));

    let mut model = vec![vec![vec![0; scale]; scale]; scale];

    for triangle in triangles {
        for ray in get_rays(triangle, scale as f32) {
            if let Some(intersection) = ray.intersect_triangle(triangle) {
                let [x, y, z] = intersection.map(|c| c.round() as isize);
                if x >= 0 && y > 0 && z > 0 {
                    let x = x as usize;
                    let y = y as usize;
                    let z = z as usize;
                    if x < scale && y < scale && z < scale {
                        model[y][z][x] = 1;
                    }
                }
            }
        }
    }

    Ok(model)
}

/// Returns an iterator over every value between min and max with a step of 0.5
fn get_pos_iter(min: f32, max: f32) -> impl Iterator<Item = f32> {
    let min = (min * 2.).floor() as i32;
    let max = (max * 2.).ceil() as i32;

    (min..=max).map(|n| n as f32 * 0.5)
}

fn get_rays(triangle: Triangle, scale: f32) -> Vec<Ray> {
    let (low, high): (Vec<f32>, Vec<f32>) = (0..=2)
        .map(|coord| {
            let coords = triangle.map(|point| point[coord]);
            let min = *coords
                .iter()
                .min_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap();
            let max = *coords
                .iter()
                .max_by(|a, b| a.partial_cmp(b).unwrap())
                .unwrap();
            (min, max)
        })
        .collect();

    let mut rays = Vec::new();
    for x in get_pos_iter(low[0], high[0]) {
        for z in get_pos_iter(low[2], high[2]) {
            rays.push(Ray {
                direction: [0., 1., 0.],
                origin: [x, low[1] - scale, z],
            });
            rays.push(Ray {
                direction: [0., 1., 0.],
                origin: [x, high[1] + scale, z],
            })
        }
        for y in get_pos_iter(low[1], high[1]) {
            rays.push(Ray {
                direction: [0., 0., 1.],
                origin: [x, y, low[2] - scale],
            });
            rays.push(Ray {
                direction: [0., 0., 1.],
                origin: [x, y, high[2] + scale],
            });
        }
    }
    for y in get_pos_iter(low[1], high[1]) {
        for z in get_pos_iter(low[2], high[2]) {
            rays.push(Ray {
                direction: [1., 0., 0.],
                origin: [low[0] - scale, y, z],
            });
            rays.push(Ray {
                direction: [1., 0., 0.],
                origin: [high[0] + scale, y, z],
            });
        }
    }

    rays
}

/// Return the cross product between two points
fn cross(a: Point, b: Point) -> Point {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// Return the dot product between two points
fn dot(a: Point, b: Point) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
