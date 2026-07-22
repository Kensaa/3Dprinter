use crate::{simulation::SharedState, turtle::EventArg};
use mlua::{Error, FromLua, Lua, Result as LuaResult, Value, Variadic};

pub fn register_api(lua: &Lua, state: &SharedState, id: usize) -> LuaResult<()> {
    macro_rules! cc_method {
        (
        $table:expr,
        $name:literal,
        |$lua:pat, $args:tt : $args_ty:ty|,
        |$state:ident| $body:block
    ) => {{
            let state = state.clone();

            $table.set(
                $name,
                #[allow(unused_parens)]
                lua.create_function(move |$lua, $args: $args_ty| {
                    // println!("\tturtle {} called {}", id, $name);
                    #[allow(unused)]
                    let $state = &mut *state.borrow_mut();
                    $body
                })?,
            )?;
        }};
    }
    macro_rules! turtle_method {
        (
        $table:expr,
        $name:literal,
        |$lua:pat, $args:tt : $args_ty:ty|,
        |$turtle:ident, $state:ident| $body:block
    ) => {{
            let state = state.clone();

            $table.set(
                $name,
                #[allow(unused_parens)]
                lua.create_function(move |$lua, $args: $args_ty| {
                    // println!("\tturtle {} called {}", id, $name);
                    let $state = &mut *state.borrow_mut();

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
            turtle_method!(
                $table,
                $name,
                |_, _: ()|,
                |turtle, state| {
                    Ok(turtle.$method())
                }
            );
        };
    }
    macro_rules! world_turtle_method {
        ($table:expr, $name:literal, $method:ident) => {
            turtle_method!(
                $table,
                $name,
                |_, _: ()|,
                |turtle, state| {
                    println!("\tturtle {} called {}", id, $name);
                    Ok(turtle.$method(&mut state.world))
                }
            );
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

    world_turtle_method!(turtle_table, "inspect", inspect_front);
    world_turtle_method!(turtle_table, "inspectUp", inspect_up);
    world_turtle_method!(turtle_table, "inspectDown", inspect_down);

    turtle_method!(
        turtle_table,
        "select",
        |_, slot: usize|,
        |turtle, world| {
            Ok(turtle.select(slot))
        }
    );
    turtle_method!(
        turtle_table,
        "getItemDetail",
        |_, (slot,_): (Option<usize>,Option<bool>)|,
        |turtle, world| {
            Ok(turtle.get_item_detail(slot))
        }
    );
    turtle_method!(
        turtle_table,
        "getItemCount",
        |_, slot: (Option<usize>)|,
        |turtle, world| {
            Ok(turtle.get_item_detail(slot).map(|slot| slot.count).unwrap_or(0))
        }
    );
    turtle_method!(
        turtle_table,
        "getItemSpace",
        |_, slot: (Option<usize>)|,
        |turtle, world| {
            Ok(64 - turtle.get_item_detail(slot).map(|slot| slot.count).unwrap_or(0))
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

    cc_method!(os_table,"getComputerID",|_,_:()|,|state| {Ok(id)});
    cc_method!(os_table,"clock",|_,_:()|,|state| {Ok(state.clock)});

    cc_method!(os_table,"startTimer",|_,(duration):(f32)|, |state| {
        let deadline = state.clock + (duration * 1000.0).round() as u64;
        let id = state.new_timer(id, deadline);
        Ok(id)
    });

    turtle_method!(
        os_table,
        "queueEvent",
        |lua, args: Variadic<Value>|,
        |turtle, state| {
            let mut args = args.into_iter().map(|arg| EventArg::from_lua(arg, lua)).collect::<Result<Vec<EventArg>,Error>>()?;
            match args.first() {
                Some(EventArg::Str(_)) => {},
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
                _ => unreachable!()
            };
            turtle.push_event(name,args);
            Ok(())
        }
    );

    turtle_method!(
    os_table,
    "getComputerLabel",
    |_,_:()|,
    |turtle, world| {
        Ok((turtle.label.clone()))
    });

    turtle_method!(
    os_table,
    "setComputerLabel",
    |_, label: Option<String>|,
    |turtle, world| {
        turtle.label = label;
        Ok(())
    });

    globals.set("os", os_table)?;

    let gps_table = lua.create_table()?;
    turtle_method!(gps_table,"locate",|_,_:()|, |turtle,world| {
        Ok(turtle.position)
    });

    globals.set("gps", gps_table)?;
    Ok(())
}
