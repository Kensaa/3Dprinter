use std::{fs, time::Instant};

use crate::{simulation::Simulation, turtle::Heading};

mod cc_api;
mod simulation;
mod turtle;
mod world;

fn main() {
    let source = fs::read_to_string("tests/test1.lua").expect("failed to read turtle source");
    // let source2 = fs::read_to_string("tests/test2.lua").expect("failed to read turtle source");

    let mut simulation = Simulation::new();

    simulation
        .add_turtle(source.clone(), (0, 0, 0), Heading::North)
        .expect("failed to add turtle 1");
    // simulation
    //     .add_turtle(source.clone(), (0, 0, -2), Heading::South)
    //     .expect("failed to add turtle 1");

    // let turtle2 = Turtle::new(source2, (1, 0, 0), Heading::North);
    // simulation.add_turtle(turtle2);

    while !simulation.all_done().unwrap() {
        let start_inst = Instant::now();
        match simulation.step() {
            Err(err) => {
                eprintln!(
                    "An error occured while running simulation:\n{}",
                    err.to_string()
                );
            }
            Ok(()) => {}
        }
        let step_time = start_inst.elapsed();
        let state = simulation.state.borrow();
        // let turtle = state.turtles.get(&0).unwrap();
        // state
        //     .turtles
        //     .iter()
        //     .for_each(|(id, turtle)| println!("{} : {:?}", id, turtle.position));
        //     println!(
        //         "{:?} (in {}us)",
        //         turtle.position,
        //         // turtle.selected_slot,
        //         step_time.as_micros()
        //     )
    }

    // println!("Hello, world!");
    // let lua = Lua::new();
    // let globals = lua.globals();
    // globals
    //     .set(
    //         "testFn",
    //         lua.create_function(|_, (a, b): (usize, usize)| return Ok(a + b))
    //             .expect("failed to create lua fnc"),
    //     )
    //     .expect("failed to add fnc");
    // let test = lua
    //     .load(fs::read_to_string("test.lua").unwrap())
    //     .set_name("test");
    // let res: usize = test.eval().unwrap();
    // println!("res : {:?}", res);
}
