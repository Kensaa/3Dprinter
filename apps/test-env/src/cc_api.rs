use crate::simulation::SharedState;
use mlua::{Lua, Result as LuaResult};

pub fn register_api(lua: &Lua, state: &SharedState, id: usize) -> LuaResult<()> {
    macro_rules! cc_method {
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
                    let $state = &mut *state.borrow_mut();
                    // #[allow(unused)]
                    // let $world = &mut state.world;

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
            cc_method!(
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
            cc_method!(
                $table,
                $name,
                |_, _: ()|,
                |turtle, state| {
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

    cc_method!(
        turtle_table,
        "select",
        |_, slot: usize|,
        |turtle, world| {
            Ok(turtle.select(slot))
        }
    );
    cc_method!(
        turtle_table,
        "getItemDetail",
        |_, (slot,_): (Option<usize>,Option<bool>)|,
        |turtle, world| {
            Ok(turtle.get_item_detail(slot))
        }
    );
    cc_method!(
        turtle_table,
        "getItemCount",
        |_, slot: (Option<usize>)|,
        |turtle, world| {
            Ok(turtle.get_item_detail(slot).map(|slot| slot.count).unwrap_or(0))
        }
    );
    cc_method!(
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

    cc_method!(os_table,"getComputerID",|_,_:()|,|turtle,state| {Ok(turtle.id)});

    globals.set("os", os_table)?;
    Ok(())
}
