use crate::{Build, CompressedBuild};
use base64::prelude::*;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use std::io::{Cursor, Write};
use wasm_bindgen::prelude::*;

fn compress(input: &[u8], level: Option<u32>) -> Vec<u8> {
    let level = level.unwrap_or(6);
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::new(level));
    encoder.write_all(input).unwrap();
    let compressed = encoder.finish().unwrap();
    compressed
}
fn decompress(input: &[u8]) -> Vec<u8> {
    let mut decoder = flate2::write::ZlibDecoder::new(Vec::new());
    decoder.write_all(input).unwrap();
    decoder.finish().unwrap()
}

#[wasm_bindgen(js_class = Build)]
impl Build {
    pub fn compress(&self) -> CompressedBuild {
        let width = self.metadata.width;
        let height = self.metadata.height;
        let depth = self.metadata.depth;
        let max_block_count = (width * height * depth) as usize;

        let bits_per_block = ((self.palette.len() as f32).log2().ceil()).max(1.) as usize;
        let block_per_byte = 8 / bits_per_block;
        let required_bytes = (max_block_count as f32 / block_per_byte as f32).ceil() as usize;

        let mut data = vec![0u8; required_bytes];
        for y in 0..height {
            for z in 0..depth {
                for x in 0..width {
                    let val = self.shape[y][z][x];
                    let index = block_position_to_index((x, y, z), depth, width);
                    let byte_index = (index / block_per_byte) as usize;
                    let bit_index = (index % block_per_byte) * bits_per_block;
                    let byte = &mut data[byte_index];

                    *byte |= val << bit_index;
                }
            }
        }
        let compressed = compress(&data, None);

        CompressedBuild {
            metadata: self.metadata.clone(),
            data: BASE64_STANDARD.encode(compressed),
            palette: self.palette.clone(),
        }
    }
}

#[wasm_bindgen(js_class = CompressedBuild)]
impl CompressedBuild {
    pub fn deserialize(str: &str) -> Result<CompressedBuild, JsValue> {
        let data = BASE64_STANDARD
            .decode(str)
            .map_err(|err| format!("failed to decode base64 : {}", err))?;

        ciborium::from_reader(Cursor::new(data))
            .map_err(|err| format!("failed to parse build : {}", err).into())
    }

    pub fn serialize(&self) -> Result<String, JsValue> {
        let mut data = Vec::new();
        ciborium::into_writer(self, &mut data)
            .map_err(|err| format!("failed to serialize value : {}", err))?;

        Ok(BASE64_STANDARD.encode(data))
    }

    pub fn uncompress(&self) -> Build {
        let shape_data_compressed = base64::prelude::BASE64_STANDARD
            .decode(self.data.clone())
            .expect("failed to decode base64");
        let shape_data = decompress(&shape_data_compressed);

        let width = self.metadata.width;
        let height = self.metadata.height;
        let depth = self.metadata.depth;

        let bits_per_block = ((self.palette.len() as f32).log2().ceil()).max(1.) as usize;
        let block_per_byte = 8 / bits_per_block;

        let mut shape = Vec::with_capacity(height);
        for y in 0..height {
            let mut h = Vec::with_capacity(depth);
            for z in 0..depth {
                let mut d = Vec::with_capacity(width);
                for x in 0..width {
                    let index = block_position_to_index((x, y, z), depth, width);
                    let byte_index = (index / block_per_byte) as usize;
                    let bit_index = (index % block_per_byte) * bits_per_block;
                    let byte = &shape_data[byte_index];
                    let palette_index = (byte >> bit_index) & ((1 << bits_per_block) - 1);
                    d.push(palette_index)
                }
                h.push(d);
            }
            shape.push(h)
        }

        Build {
            metadata: self.metadata.clone(),
            shape: shape,
            palette: self.palette.clone(),
        }
    }
}

/// Converts x, y, z coordinates to an index in a YZX ordered block list.
fn block_position_to_index(block_pos: (usize, usize, usize), depth: usize, width: usize) -> usize {
    let (x, y, z) = block_pos;
    y * depth * width + z * width + x
}
