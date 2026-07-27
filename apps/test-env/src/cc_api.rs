use crate::{simulation::SharedState, turtle::EventArg};
use mlua::{Error, FromLua, IntoLua, Lua, MultiValue, Result as LuaResult, Value, Variadic};
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
    Ok(())
}
