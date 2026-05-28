use flate2::write::ZlibEncoder;
use flate2::Compression;
use js_sys::{Array, Number};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::io::Write;
use wasm_bindgen::prelude::*;

use crate::voxelization::voxelize;

mod build_compression;
mod voxelization;

extern crate console_error_panic_hook;
use console_error_panic_hook::set_once as set_panic_hook;
#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    set_panic_hook();
    Ok(())
}

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

#[wasm_bindgen]
pub fn compress_buffer(data: &[u8], level: u32) -> Result<Vec<u8>, JsError> {
    let compressed = compress(data, Some(level));
    Ok(compressed)
}

#[wasm_bindgen]
pub fn decompress_buffer(data: &[u8]) -> Result<Vec<u8>, JsError> {
    let decompressed = decompress(data);
    Ok(decompressed)
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ImageMetadata {
    pub preview: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct ModelMetadata {}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum BuildType {
    Image(ImageMetadata),
    Model(ModelMetadata),
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct BuildMetadata {
    pub r#type: BuildType,
    pub width: usize,
    pub depth: usize,
    pub height: usize,
    pub block_count: u32,
}

#[wasm_bindgen(getter_with_clone)]
pub struct Build {
    pub metadata: BuildMetadata,
    shape: Vec<Vec<Vec<u8>>>,
    palette: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct CompressedBuild {
    pub metadata: BuildMetadata,
    pub data: String,
    palette: Vec<String>,
}

#[wasm_bindgen(js_class = Build)]
impl Build {
    #[allow(unused)]
    pub fn from_image(image_data: &[u8]) -> Build {
        Build {
            shape: Vec::new(),
            palette: Vec::new(),
            metadata: BuildMetadata {
                r#type: BuildType::Image(ImageMetadata {
                    preview: "".to_string(),
                }),
                width: 0,
                depth: 0,
                height: 0,
                block_count: 0,
            },
        }
    }

    pub fn from_model(model_data: String, scale: usize) -> Result<Build, JsValue> {
        let shape = voxelize(Cursor::new(model_data), scale)?;
        Ok(Build {
            shape,
            palette: Vec::new(),
            metadata: BuildMetadata {
                r#type: BuildType::Model(ModelMetadata {}),
                width: scale,
                depth: scale,
                height: scale,
                block_count: 0,
            },
        })
    }

    pub fn get_shape(&self) -> Array<Array<Array<Number>>> {
        Array::from_iter_typed(self.shape.iter().map(|layer| {
            Array::from_iter_typed(
                layer
                    .iter()
                    .map(|row| Array::from_iter_typed(row.iter().copied().map(Number::from))),
            )
        }))
    }
}
