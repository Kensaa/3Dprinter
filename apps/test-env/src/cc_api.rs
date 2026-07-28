use crate::{filesystem::Path, simulation::SharedState, turtle::EventArg};
use mlua::{Error, FromLua, IntoLua, Lua, MultiValue, Result as LuaResult, Table, Value, Variadic};
use std::{cell::RefCell, format, rc::Rc};
use tungstenite::Message;

pub fn register_api(lua: &Lua, state: &SharedState, id: usize) -> LuaResult<()> {
    macro_rules! cc_method {
        (
        $table:expr,
        $name:literal,
        |$lua:pat, $args:tt : $args_ty:ty| {},
        |$state:ident, $shared:ident| $body:block
    ) => {{
            let shared = state.clone();

            $table.set(
                $name,
                #[allow(unused)]
                lua.create_function(move |$lua, $args: $args_ty| {
                    let $shared = shared.clone();
                    let $state = &mut *shared.borrow_mut();
                    $body
                })?,
            )?;
        }};
    }
    macro_rules! turtle_method {
        (
        $table:expr,
        $name:literal,
        |$lua:pat, $args:tt : $args_ty:ty| {},
        |$turtle:ident, $state:ident, $shared:ident| $body:block
    ) => {{
            let shared = state.clone();

            $table.set(
                $name,
                #[allow(unused_parens)]
                #[allow(unused)]
                lua.create_function(move |$lua, $args: $args_ty| {
                    // println!("\tturtle {} called {}", id, $name);
                    let $shared = shared.clone();
                    let $state = &mut *shared.borrow_mut();

                    let $turtle = $state
                        .turtles
                        .get_mut(&id)
                        .ok_or(mlua::Error::RuntimeError(
                            "turtle not registered in the simulation environment".to_string(),
                        ))?;

                    $body
                })?,
            )?;
        }};
    }
    macro_rules! no_arg_turtle_method {
        ($table:expr, $name:literal, $method:ident) => {
            turtle_method!($table, $name, |_, _: ()| {}, |turtle, state, shared| {
                Ok(turtle.$method())
            });
        };
    }
    macro_rules! world_turtle_method {
        ($table:expr, $name:literal, $method:ident) => {
            turtle_method!($table, $name, |_, _: ()| {}, |turtle, state, shared| {
                println!("\tturtle {} called {}", id, $name);
                Ok(turtle.$method(&mut state.world))
            });
        };
    }

    let globals = lua.globals();
    let turtle_table = lua.create_table()?;
    world_turtle_method!(turtle_table, "forward", forward);
    world_turtle_method!(turtle_table, "back", backward);
    world_turtle_method!(turtle_table, "up", up);
    world_turtle_method!(turtle_table, "down", down);
    world_turtle_method!(turtle_table, "turnLeft", turn_left);
    world_turtle_method!(turtle_table, "turnRight", turn_right);

    world_turtle_method!(turtle_table, "place", place_front);
    world_turtle_method!(turtle_table, "placeUp", place_up);
    world_turtle_method!(turtle_table, "placeDown", place_down);
    world_turtle_method!(turtle_table, "dig", dig_front);
    world_turtle_method!(turtle_table, "digUp", dig_up);
    world_turtle_method!(turtle_table, "digDown", dig_down);

    turtle_method!(
        turtle_table,
        "inspect",
        |lua, _: ()| {},
        |turtle, state, shared| {
            if let Some(detail) = turtle.inspect_front(&mut state.world) {
                return Ok(MultiValue::from_vec(vec![
                    Value::Boolean(true),
                    detail.into_lua(lua)?,
                ]));
            } else {
                return Ok(MultiValue::from_vec(vec![Value::Boolean(false)]));
            }
        }
    );

    turtle_method!(
        turtle_table,
        "inspectUp",
        |lua, _: ()| {},
        |turtle, state, shared| {
            if let Some(detail) = turtle.inspect_up(&mut state.world) {
                return Ok(MultiValue::from_vec(vec![
                    Value::Boolean(true),
                    detail.into_lua(lua)?,
                ]));
            } else {
                return Ok(MultiValue::from_vec(vec![Value::Boolean(false)]));
            }
        }
    );

    turtle_method!(
        turtle_table,
        "inspectDown",
        |lua, _: ()| {},
        |turtle, state, shared| {
            if let Some(detail) = turtle.inspect_down(&mut state.world) {
                return Ok(MultiValue::from_vec(vec![
                    Value::Boolean(true),
                    detail.into_lua(lua)?,
                ]));
            } else {
                return Ok(MultiValue::from_vec(vec![Value::Boolean(false)]));
            }
        }
    );

    turtle_method!(
        turtle_table,
        "select",
        |_, slot: usize| {},
        |turtle, state, shared| { Ok(turtle.select(slot)) }
    );
    turtle_method!(
        turtle_table,
        "getItemDetail",
        |_, (slot, _): (Option<usize>, Option<bool>)| {},
        |turtle, state, shared| { Ok(turtle.get_item_detail(slot)) }
    );
    turtle_method!(
        turtle_table,
        "getItemCount",
        |_, slot: (Option<usize>)| {},
        |turtle, state, shared| {
            Ok(turtle
                .get_item_detail(slot)
                .map(|slot| slot.count)
                .unwrap_or(0))
        }
    );
    turtle_method!(
        turtle_table,
        "getItemSpace",
        |_, slot: (Option<usize>)| {},
        |turtle, state, shared| {
            Ok(64
                - turtle
                    .get_item_detail(slot)
                    .map(|slot| slot.count)
                    .unwrap_or(0))
        }
    );

    no_arg_turtle_method!(turtle_table, "getSelectedSlot", get_selected_slot);
    no_arg_turtle_method!(turtle_table, "equipLeft", equip_left);
    no_arg_turtle_method!(turtle_table, "equipRight", equip_right);
    no_arg_turtle_method!(turtle_table, "getEquippedLeft", get_equipped_left);
    no_arg_turtle_method!(turtle_table, "getEquippedRight", get_equipped_right);

    // the table is not called "turtle" so it can be wrapped by the prelude script to make functions yield
    globals.set("nativeTurtle", turtle_table)?;

    let os_table = lua.create_table()?;

    cc_method!(os_table, "getComputerID", |_, _: ()| {}, |state, shared| {
        Ok(id)
    });
    cc_method!(os_table, "clock", |_, _: ()| {}, |state, shared| {
        Ok(state.clock)
    });

    cc_method!(
        os_table,
        "startTimer",
        |_, (duration): (f32)| {},
        |state, shared| {
            let deadline = state.clock + (duration * 1000.0).round() as u64;
            let id = state.new_timer(id, deadline);
            Ok(id)
        }
    );

    turtle_method!(
        os_table,
        "queueEvent",
        |lua, args: Variadic<Value>| {},
        |turtle, state, shared| {
            let mut args = args
                .into_iter()
                .map(|arg| EventArg::from_lua(arg, lua))
                .collect::<Result<Vec<EventArg>, Error>>()?;
            match args.first() {
                Some(EventArg::Str(_)) => {}
                other => {
                    let got = match other {
                        None => "no value",
                        Some(EventArg::Nil) => "nil",
                        Some(_) => "unknown",
                    };
                    return Err(mlua::Error::RuntimeError(format!(
                        "bad argument #1 (string expected, got {got})"
                    )));
                }
            };
            let name = match args.remove(0) {
                EventArg::Str(s) => s,
                _ => unreachable!(),
            };
            turtle.push_event(name, args);
            Ok(())
        }
    );

    turtle_method!(
        os_table,
        "getComputerLabel",
        |_, _: ()| {},
        |turtle, state, shared| { Ok((turtle.label.clone())) }
    );

    turtle_method!(
        os_table,
        "setComputerLabel",
        |_, label: Option<String>| {},
        |turtle, world, shared| {
            turtle.label = label;
            Ok(())
        }
    );

    globals.set("os", os_table)?;

    let gps_table = lua.create_table()?;
    turtle_method!(
        gps_table,
        "locate",
        |_, _: ()| {},
        |turtle, state, shared| { Ok(turtle.position) }
    );

    globals.set("gps", gps_table)?;

    let http_table = lua.create_table()?;
    turtle_method!(
        http_table,
        "websocket",
        |lua, url: String| {},
        |turtle, state, shared| {
            match turtle.new_websocket(url) {
                Err(err) => Ok(MultiValue::from_vec(vec![
                    Value::Nil,
                    Value::String(lua.create_string(err)?),
                ])),
                Ok(id) => {
                    let table = lua.create_table()?;
                    {
                        let state = shared.clone();
                        table.set(
                            "send",
                            lua.create_function(move |_, (data, is_binary): (String, bool)| {
                                let mut state = state.borrow_mut();
                                let turtle = state.turtles.get_mut(&id).ok_or(
                                    Error::RuntimeError("turtle not registered".to_string()),
                                )?;
                                match turtle.websockets.get_mut(&id) {
                                    None => {
                                        return Err(Error::RuntimeError(
                                            "the current socket doesn't exist anymore".to_string(),
                                        ));
                                    }
                                    Some(socket) => {
                                        let socket_message = if is_binary {
                                            Message::binary(data)
                                        } else {
                                            Message::text(data)
                                        };
                                        socket.send(socket_message).map_err(|err| {
                                            Error::RuntimeError(format!(
                                                "failed to send message : {}",
                                                err.to_string()
                                            ))
                                        })?;
                                    }
                                }
                                Ok(())
                            })?,
                        )?;
                    }

                    {
                        let state = shared.clone();
                        table.set(
                            "close",
                            lua.create_function(move |_, (data, is_binary): (String, bool)| {
                                let mut state = state.borrow_mut();
                                let turtle = state.turtles.get_mut(&id).ok_or(
                                    Error::RuntimeError("turtle not registered".to_string()),
                                )?;
                                match turtle.websockets.get_mut(&id) {
                                    None => {}
                                    Some(socket) => {
                                        socket.close(None).map_err(|err| {
                                            Error::RuntimeError(format!(
                                                "failed to close socket : {}",
                                                err.to_string()
                                            ))
                                        })?;
                                    }
                                }
                                Ok(())
                            })?,
                        )?;
                    }

                    let wrap: mlua::Function = lua.globals().get("__wrapWebSocketHandle")?;
                    let table: mlua::Table = wrap.call((table, id))?;

                    Ok(MultiValue::from_vec(vec![Value::Table(table)]))
                }
            }
        }
    );

    globals.set("http", http_table)?;

    let peripheral_table = lua.create_table()?;

    turtle_method!(
        peripheral_table,
        "call",
        |lua, (heading, method): (String, String)| {},
        |turtle, state, shared| {
            let target = turtle
                .position_from_direction_string(heading)
                .map_err(|err| Error::RuntimeError(err))?;
            let world = &state.world;
            let turtle_id = if let Some(turtle_id) = world.turtle_pos.get(&target) {
                turtle_id
            } else {
                return Err(Error::RuntimeError(
                    "peripheral.call is implemented only for turtles".to_string(),
                ));
            };

            match method.as_str() {
                "getID" => Ok(*turtle_id),
                _ => Err(Error::RuntimeError(format!("unknown method : {}", method))),
            }
        }
    );

    globals.set("peripheral", peripheral_table)?;

    let fs_table = lua.create_table()?;

    turtle_method!(
        fs_table,
        "list",
        |lua, path: String| {},
        |turtle, state, shared| {
            let dir = turtle.fs_root.get(path.clone());
            if let Some(dir) = dir {
                if dir.is_dir() {
                    return Ok(dir.list_files());
                } else {
                    return Err(Error::RuntimeError(format!(
                        "\"{}\" : not a directory",
                        path
                    )));
                }
            } else {
                return Err(Error::RuntimeError(format!("\"{}\" : no such file", path)));
            }
        }
    );

    turtle_method!(
        fs_table,
        "combine",
        |lua, args: Variadic<Value>| {},
        |turtle, state, shared| {
            let path: String = args
                .into_iter()
                .filter_map(|val| {
                    if let Value::String(s) = val {
                        Some(s.to_str().unwrap().to_string().into())
                    } else {
                        None
                    }
                })
                .fold(Path::new(), |mut acc, path| acc + path)
                .into();
            Ok(path)
        }
    );

    turtle_method!(
        fs_table,
        "getName",
        |lua, path: String| {},
        |turtle, state, shared| {
            let path: Path = path.into();
            if let Some(filename) = path.get_filename() {
                Ok(filename.clone())
            } else {
                Err(Error::RuntimeError("no filename found".to_string()))
            }
        }
    );

    turtle_method!(
        fs_table,
        "getDir",
        |lua, path: String| {},
        |turtle, state, shared| {
            let mut path: Path = path.into();
            path.pop_filename();
            let path_string: String = path.into();
            Ok(path_string)
        }
    );

    turtle_method!(
        fs_table,
        "exists",
        |lua, path: String| {},
        |turtle, state, shared| { Ok(turtle.fs_root.get(path).is_some()) }
    );

    turtle_method!(
        fs_table,
        "isDir",
        |lua, path: String| {},
        |turtle, state, shared| {
            if let Some(dir) = turtle.fs_root.get(path) {
                Ok(dir.is_dir())
            } else {
                Ok(true)
            }
        }
    );

    turtle_method!(
        fs_table,
        "makeDir",
        |lua, path: String| {},
        |turtle, state, shared| {
            turtle.fs_root.make_dir(path);
            Ok(())
        }
    );

    turtle_method!(
        fs_table,
        "delete",
        |lua, path: String| {},
        |turtle, state, shared| {
            turtle.fs_root.remove(path);
            Ok(())
        }
    );

    turtle_method!(
        fs_table,
        "open",
        |lua, (path, mode): (String, Option<String>)| {},
        |turtle, state, shared| {
            let path: Path = path.into();
            let mode = mode.unwrap_or_else(|| "r".to_string());
            let err = |lua: &Lua, msg: String| -> LuaResult<MultiValue> {
                Ok(MultiValue::from_vec(vec![
                    Value::Nil,
                    Value::String(lua.create_string(&msg)?),
                ]))
            };

            match mode.as_str() {
                "r" | "rb" => match turtle.fs_root.get(path.clone()) {
                    None => err(lua, format!("{path}: No such file")),
                    Some(node) if node.is_dir() => err(lua, format!("{path}: Is a directory")),
                    Some(node) => {
                        let content = node.get_content().unwrap().clone();
                        let handle = make_read_handle(lua, content)?;
                        Ok(MultiValue::from_vec(vec![Value::Table(handle)]))
                    }
                },
                "w" | "wb" | "a" | "ab" => {
                    if matches!(turtle.fs_root.get(path.clone()), Some(n) if n.is_dir()) {
                        return err(lua, format!("{path}: Is a directory"));
                    }
                    let initial = if mode.starts_with('a') {
                        match turtle.fs_root.get(path.clone()) {
                            Some(n) if n.is_file() => n.get_content().unwrap().clone(),
                            _ => String::new(),
                        }
                    } else {
                        String::new()
                    };
                    let handle =
                        make_write_handle(lua, shared.clone(), turtle.id, path.clone(), initial)?;
                    Ok(MultiValue::from_vec(vec![Value::Table(handle)]))
                }
                other => err(lua, format!("Unsupported mode: {other}")),
            }
        }
    );

    globals.set("fs", fs_table)?;

    Ok(())
}
fn make_read_handle(lua: &Lua, content: String) -> LuaResult<Table> {
    let table = lua.create_table()?;
    let cursor = Rc::new(RefCell::new(0usize));
    let lines: Rc<Vec<String>> = Rc::new(content.lines().map(String::from).collect());

    table.set(
        "readAll",
        lua.create_function({
            let content = content.clone();
            move |lua, ()| lua.create_string(&content).map(Value::String)
        })?,
    )?;

    table.set(
        "readLine",
        lua.create_function({
            let lines = lines.clone();
            let cursor = cursor.clone();
            move |lua, ()| {
                let mut i = cursor.borrow_mut();
                if *i >= lines.len() {
                    return Ok(Value::Nil);
                }
                let line = lua.create_string(&lines[*i])?;
                *i += 1;
                Ok(Value::String(line))
            }
        })?,
    )?;

    table.set("close", lua.create_function(|_, ()| Ok(()))?)?;
    Ok(table)
}

fn make_write_handle(
    lua: &Lua,
    shared: SharedState,
    turtle_id: usize,
    path: Path,
    initial: String,
) -> LuaResult<Table> {
    let table = lua.create_table()?;
    let buffer = Rc::new(RefCell::new(initial));

    let flush = {
        let shared = shared.clone();
        let buffer = buffer.clone();
        let path = path.clone();
        move || {
            let mut state = shared.borrow_mut();
            if let Some(turtle) = state.turtles.get_mut(&turtle_id) {
                turtle
                    .fs_root
                    .write_file(path.clone(), buffer.borrow().clone());
            }
        }
    };

    table.set(
        "write",
        lua.create_function({
            let buffer = buffer.clone();
            move |_, s: String| {
                buffer.borrow_mut().push_str(&s);
                Ok(())
            }
        })?,
    )?;

    table.set(
        "writeLine",
        lua.create_function({
            let buffer = buffer.clone();
            move |_, s: String| {
                let mut b = buffer.borrow_mut();
                b.push_str(&s);
                b.push('\n');
                Ok(())
            }
        })?,
    )?;

    table.set(
        "flush",
        lua.create_function({
            let flush = flush.clone();
            move |_, ()| {
                flush();
                Ok(())
            }
        })?,
    )?;

    table.set(
        "close",
        lua.create_function(move |_, ()| {
            flush();
            Ok(())
        })?,
    )?;
    Ok(table)
}
