use flate2::write::ZlibEncoder;
use flate2::Compression;
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::io::Write;

fn compress(input: &[u8], level: Option<u32>) -> Vec<u8>{
    let level = level.unwrap_or(6);
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::new(level.into()));
    encoder.write_all(input).unwrap();
    let compressed = encoder.finish().unwrap();
    compressed

}

fn compress_buffer_to_buffer(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let input = cx.argument::<JsBuffer>(0)?;
    let level = cx.argument_opt(1);

    let level = match level {
        Some(arg) => {
            // If the argument is passed, try to downcast it to a number
            let num = arg.downcast::<JsNumber, _>(&mut cx);
            // If the downcast fails, use the default value of 6
            let num = match num {
                Ok(num) => num.value(&mut cx) as u32,
                Err(_) => 6,
            };
            match num {
                0..=9 => num,
                _ => {
                    // If the number is out of range, throw an error
                    return cx.throw_range_error("Invalid compression level");
                }
            }
        }
        // If the argument is not passed, use the default value of 6
        None => 6,
    };
    let input = input.as_slice(&mut cx);

    let compressed = compress(input, Some(level));

    let mut buffer = cx.buffer(compressed.len())?;
    buffer.as_mut_slice(&mut cx).copy_from_slice(&compressed);

    Ok(buffer)
}

fn decompress(input: &[u8]) -> Vec<u8> {
    let mut decoder = flate2::write::ZlibDecoder::new(Vec::new());
    decoder.write_all(input).unwrap();
    decoder.finish().unwrap()
}

fn decompress_buffer_to_buffer(mut cx: FunctionContext) -> JsResult<JsBuffer> {
    let input = cx.argument::<JsBuffer>(0)?;
    let input = input.as_slice(&mut cx);

    let decompressed = decompress(input);

    let mut buffer = cx.buffer(decompressed.len())?;
    buffer.as_mut_slice(&mut cx).copy_from_slice(&decompressed);

    Ok(buffer)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("compressBufferToBuffer", compress_buffer_to_buffer)?;
    cx.export_function("decompressBufferToBuffer", decompress_buffer_to_buffer)?;
    Ok(())
}
