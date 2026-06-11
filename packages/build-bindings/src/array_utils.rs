use std::fmt::Display;

/// Returns the index of the first element in `arr` different from `null`, or `arr.len()` if there is none
fn get_first_non_null<E>(arr: &Vec<E>, null: E) -> usize
where
    E: Eq,
{
    for (i, e) in arr.into_iter().enumerate() {
        if *e != null {
            return i;
        }
    }
    arr.len()
}

/// Returns the index of the last element in `arr` different from `null`, or 0 if there is none
fn get_last_non_null<E>(arr: &Vec<E>, null: E) -> usize
where
    E: Eq,
{
    for (i, e) in arr.into_iter().enumerate().rev() {
        if *e != null {
            return i;
        }
    }
    0
}

fn is_2d_array_empty<E>(grid: &Vec<Vec<E>>, null: E) -> bool
where
    E: Eq + Copy,
{
    !(grid.iter().any(|row| row.iter().any(|e| *e != null)))
}

#[allow(unused)]
/// Trims elements equals to `null` on the borders of the cube in `arr`
pub fn trim_3d_array<E>(arr: &mut Vec<Vec<Vec<E>>>, null: E)
where
    E: Eq + Copy + Display,
{
    if arr.len() == 0 {
        return;
    }
    // remove empty layer at the top and bottom
    let first_layer = arr
        .iter()
        .position(|layer| !is_2d_array_empty(layer, null))
        .unwrap_or(arr.len());

    arr.drain(..first_layer);

    // if there are no layer left return
    if arr.len() == 0 {
        return;
    }

    let last_layer = arr
        .iter()
        .rposition(|layer| !is_2d_array_empty(layer, null))
        .unwrap();
    arr.drain(last_layer + 1..);

    // remove empty verical slices from the left and right of the cube
    let first_side_slice = arr
        .iter()
        .map(|layer| {
            layer
                .iter()
                .map(|line| get_first_non_null(line, null))
                .min()
                .unwrap()
        })
        .min()
        .unwrap();

    println!("{}", first_side_slice);
    print_arr(&arr[0]);

    arr.iter_mut().for_each(|layer| {
        layer.iter_mut().for_each(|depth_row| {
            depth_row.drain(..first_side_slice);
        });
    });
    print_arr(&arr[0]);

    let last_side_slice = arr
        .iter()
        .map(|layer| {
            layer
                .iter()
                .map(|line| get_last_non_null(line, null))
                .max()
                .unwrap()
        })
        .max()
        .unwrap();

    arr.iter_mut().for_each(|layer| {
        layer.iter_mut().for_each(|depth_row| {
            depth_row.drain(last_side_slice + 1..);
        });
    });

    // remove empty vertical slices from the font and back
    let first_front_slice = arr
        .iter()
        .map(|layer| {
            let width = layer[0].len();
            (0..width)
                .map(move |x| {
                    let depth_row: Vec<E> = layer.iter().map(move |depth| depth[x]).collect();
                    get_first_non_null(&depth_row, null)
                })
                .min()
                .unwrap()
        })
        .min()
        .unwrap();

    arr.iter_mut().for_each(|layer| {
        layer.drain(..first_front_slice);
    });

    let last_back_slice = arr
        .iter()
        .map(|layer| {
            let width = layer[0].len();
            (0..width)
                .map(move |x| {
                    let depth_row: Vec<E> = layer.iter().map(move |depth| depth[x]).collect();
                    get_last_non_null(&depth_row, null)
                })
                .max()
                .unwrap()
        })
        .max()
        .unwrap();

    arr.iter_mut().for_each(|layer| {
        layer.drain(last_back_slice + 1..);
    });
}

fn print_arr<E>(arr: &Vec<Vec<E>>)
where
    E: Display,
{
    for line in arr.iter() {
        for e in line {
            print!("{:02} ", e);
        }
        print!("\n");
    }
}

#[allow(unused)]
/// Count every element in `arr` that are not equal to `null`
pub fn count_not_null_3d_array<E>(arr: &Vec<Vec<Vec<E>>>, null: E) -> usize
where
    E: Eq + Copy,
{
    arr.iter()
        .flatten()
        .flatten()
        .map(|e| if *e != null { 1 } else { 0 })
        .sum()
}

#[allow(unused)]
/// Count every element in `arr` that are equal to `target`
pub fn count_equal_3d_array<E>(arr: &Vec<Vec<Vec<E>>>, target: E) -> usize
where
    E: Eq + Copy,
{
    arr.iter()
        .flatten()
        .flatten()
        .map(|e| if *e == target { 1 } else { 0 })
        .sum()
}

pub fn generate_3d_array<E>(height: usize, depth: usize, width: usize, e: E) -> Vec<Vec<Vec<E>>>
where
    E: Copy,
{
    vec![vec![vec![e; width]; depth]; height]
}

/// Rotate `arr` along the X axis (`arr` is expected to be YZX ordered)
/// Returns a newly allocated array
pub fn rotate_x_3d_array<E>(arr: &Vec<Vec<Vec<E>>>, null: E) -> Vec<Vec<Vec<E>>>
where
    E: Copy,
{
    let height = arr.len();
    if height == 0 {
        return arr.clone();
    }
    let depth = arr[0].len();
    if depth == 0 {
        return arr.clone();
    }
    let width = arr[0][0].len();
    if width == 0 {
        return arr.clone();
    }
    // Rotate along the X axis, new dimensions:
    // height = depth
    // depth = height
    // width = width
    let mut new_arr = generate_3d_array(depth, height, width, null);
    for (y, layer) in arr.into_iter().enumerate() {
        for (z, row) in layer.into_iter().enumerate() {
            for (x, e) in row.into_iter().enumerate() {
                new_arr[depth - z - 1][y][x] = *e;
            }
        }
    }

    new_arr
}

/// Rotate `arr` along the Y axis (`arr` is expected to be YZX ordered)
/// Returns a newly allocated array
pub fn rotate_y_3d_array<E>(arr: &Vec<Vec<Vec<E>>>, null: E) -> Vec<Vec<Vec<E>>>
where
    E: Copy,
{
    let height = arr.len();
    if height == 0 {
        return arr.clone();
    }
    let depth = arr[0].len();
    if depth == 0 {
        return arr.clone();
    }
    let width = arr[0][0].len();
    if width == 0 {
        return arr.clone();
    }
    // Rotate along the Y axis, new dimensions:
    // height = height
    // depth = width
    // width = depth
    let mut new_arr = generate_3d_array(height, width, depth, null);
    for (y, layer) in arr.into_iter().enumerate() {
        for (z, row) in layer.into_iter().enumerate() {
            for (x, e) in row.into_iter().enumerate() {
                new_arr[y][x][depth - z - 1] = *e;
            }
        }
    }

    new_arr
}

/// Rotate `arr` along the Z axis (`arr` is expected to be YZX ordered)
/// Returns a newly allocated array
pub fn rotate_z_3d_array<E>(arr: &Vec<Vec<Vec<E>>>, null: E) -> Vec<Vec<Vec<E>>>
where
    E: Copy,
{
    let height = arr.len();
    if height == 0 {
        return arr.clone();
    }
    let depth = arr[0].len();
    if depth == 0 {
        return arr.clone();
    }
    let width = arr[0][0].len();
    if width == 0 {
        return arr.clone();
    }
    // Rotate along the Z axis, new dimensions:
    // height = width
    // depth = depth
    // width = height
    let mut new_arr = generate_3d_array(width, depth, height, null);
    for (y, layer) in arr.into_iter().enumerate() {
        for (z, row) in layer.into_iter().enumerate() {
            for (x, e) in row.into_iter().enumerate() {
                new_arr[width - x - 1][z][y] = *e;
            }
        }
    }

    new_arr
}

/// Returns a tuple (height,depth,width) corresponding to the shape of `arr`
pub fn get_shape_3d_array<E>(arr: &Vec<Vec<Vec<E>>>) -> (usize, usize, usize) {
    let height = arr.len();
    let depth = if height > 0 { arr[0].len() } else { 0 };
    let width = if depth > 0 { arr[0][0].len() } else { 0 };
    (height, depth, width)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trim_3d_empty() {
        let mut arr1: Vec<Vec<Vec<u8>>> = Vec::new();
        let expected1: Vec<Vec<Vec<u8>>> = Vec::new();
        trim_3d_array(&mut arr1, 0);
        assert_eq!(arr1, expected1);

        let mut arr2: Vec<Vec<Vec<u8>>> = vec![vec![], vec![], vec![]];
        let expected2: Vec<Vec<Vec<u8>>> = Vec::new();
        trim_3d_array(&mut arr2, 0);
        assert_eq!(arr2, expected2);

        let mut arr3: Vec<Vec<Vec<u8>>> = vec![vec![vec![], vec![], vec![]]];
        let expected3: Vec<Vec<Vec<u8>>> = Vec::new();
        trim_3d_array(&mut arr3, 0);
        assert_eq!(arr3, expected3);
    }

    #[test]
    fn test_trim_3d_top_bottom() {
        let mut arr = vec![
            vec![vec![0, 0], vec![0, 0], vec![0, 0]],
            vec![vec![0, 0], vec![1, 0], vec![0, 0]],
            vec![vec![1, 1], vec![1, 1], vec![1, 1]],
            vec![vec![0, 0], vec![0, 0], vec![0, 0]],
        ];
        let expected = vec![
            vec![vec![0, 0], vec![1, 0], vec![0, 0]],
            vec![vec![1, 1], vec![1, 1], vec![1, 1]],
        ];
        trim_3d_array(&mut arr, 0);
        assert_eq!(arr, expected)
    }

    #[test]
    fn test_trim_3d_left_right() {
        let mut arr = vec![vec![
            vec![0, 0, 1, 1, 0, 0],
            vec![0, 1, 1, 1, 0, 0],
            vec![0, 0, 1, 1, 0, 0],
        ]];
        let expected = vec![vec![vec![0, 1, 1], vec![1, 1, 1], vec![0, 1, 1]]];
        trim_3d_array(&mut arr, 0);
        assert_eq!(arr, expected)
    }

    #[test]
    fn test_trim_3d_front_back() {
        let mut arr = vec![
            vec![vec![0, 1], vec![1, 1], vec![1, 1], vec![0, 0]],
            vec![vec![0, 0], vec![1, 1], vec![1, 1], vec![0, 0]],
        ];
        let expected = vec![
            vec![vec![0, 1], vec![1, 1], vec![1, 1]],
            vec![vec![0, 0], vec![1, 1], vec![1, 1]],
        ];
        trim_3d_array(&mut arr, 0);
        assert_eq!(arr, expected)
    }

    #[test]
    fn test_trim_3d_all() {
        let mut arr = vec![
            vec![
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 1, 1, 0, 0],
                vec![0, 0, 1, 1, 0, 0],
                vec![0, 0, 1, 1, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0],
            ],
        ];
        let expected = vec![vec![vec![1, 1], vec![1, 1], vec![1, 1]]];
        trim_3d_array(&mut arr, 0);
        assert_eq!(arr, expected);
    }

    #[test]
    fn test_trim_3d_star() {
        let mut arr = vec![
            vec![
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 1, 0, 1, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 1, 0, 1, 0, 0],
                vec![0, 1, 0, 0, 0, 1, 0],
                vec![0, 0, 1, 0, 1, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 1, 0, 1, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 1, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0, 0, 0],
            ],
        ];
        let expected = vec![
            vec![
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 1, 0, 0],
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 1, 0, 0],
                vec![0, 1, 0, 1, 0],
                vec![0, 0, 1, 0, 0],
                vec![0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 1, 0, 0],
                vec![0, 1, 0, 1, 0],
                vec![1, 0, 0, 0, 1],
                vec![0, 1, 0, 1, 0],
                vec![0, 0, 1, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 1, 0, 0],
                vec![0, 1, 0, 1, 0],
                vec![0, 0, 1, 0, 0],
                vec![0, 0, 0, 0, 0],
            ],
            vec![
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 1, 0, 0],
                vec![0, 0, 0, 0, 0],
                vec![0, 0, 0, 0, 0],
            ],
        ];
        trim_3d_array(&mut arr, 0);
        assert_eq!(arr, expected);
    }

    #[test]
    fn test_trim_3d_big() {
        let mut arr = vec![vec![
            vec![
                16, 01, 16, 01, 16, 01, 01, 01, 02, 03, 02, 01, 01, 16, 01, 16, 01,
            ],
            vec![16, 01, 16, 01, 01, 02, 10, 10, 10, 10, 10, 02, 01, 16, 01],
            vec![16, 01, 16, 01, 01, 05, 10, 10, 03, 13, 13, 02, 01, 16, 01],
            vec![16, 01, 16, 01, 01, 10, 10, 13, 8, 11, 6, 6, 7, 1],
            vec![01, 02, 02, 10, 10, 14, 6, 6, 6, 6, 6, 15],
            vec![02, 10, 13, 10, 10, 9, 12, 11, 11, 11, 12, 1],
            vec![02, 05, 02, 05, 10, 3, 15, 14, 14, 9, 1, 1],
            vec![02, 05, 02, 05, 10, 10, 10, 3, 3, 05, 3, 1],
            vec![02, 05, 13, 05, 10, 10, 10, 10, 10, 10, 3, 1],
            vec![02, 05, 13, 05, 05, 5, 10, 10, 10, 10, 13, 1],
            vec![02, 05, 13, 05, 05, 5, 5, 5, 5, 5, 2, 1],
            vec![01, 02, 02, 05, 05, 5, 13, 13, 4, 5, 2, 1],
            vec![16, 01, 01, 01, 04, 05, 5, 1, 2, 5, 5, 2, 1],
            vec![16, 01, 16, 01, 01, 4, 05, 4, 1, 2, 5, 4, 2, 16, 1],
            vec![16, 01, 16, 01, 01, 2, 13, 2, 1, 1, 1, 1, 1, 16, 1],
        ]];
        trim_3d_array(&mut arr, 0);
    }

    #[test]
    fn test_rotate_x() {
        let arr = vec![vec![vec![1, 2, 3], vec![4, 5, 6], vec![7, 8, 9]]];

        let expected = vec![
            vec![vec![7, 8, 9]],
            vec![vec![4, 5, 6]],
            vec![vec![1, 2, 3]],
        ];

        assert_eq!(rotate_x_3d_array(&arr, 0), expected);
    }

    #[test]
    fn test_rotate_y() {
        let arr = vec![vec![vec![1, 2, 3], vec![4, 5, 6], vec![7, 8, 9]]];
        let expected = vec![vec![vec![7, 4, 1], vec![8, 5, 2], vec![9, 6, 3]]];
        assert_eq!(rotate_y_3d_array(&arr, 0), expected);
    }

    #[test]
    fn test_rotate_z() {
        let arr = vec![vec![vec![1, 2, 3], vec![4, 5, 6], vec![7, 8, 9]]];
        let expected = vec![
            vec![vec![3], vec![6], vec![9]],
            vec![vec![2], vec![5], vec![8]],
            vec![vec![1], vec![4], vec![7]],
        ];
        assert_eq!(rotate_z_3d_array(&arr, 0), expected);
    }
}
