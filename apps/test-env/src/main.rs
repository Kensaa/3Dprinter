use std::{fs, time::Instant};

use crate::{simulation::Simulation, turtle::Heading};

mod cc_api;
mod simulation;
mod turtle;
mod world;

fn main() {
    let source1 = fs::read_to_string("tests/testws.lua").expect("failed to read turtle source");
    // let source2 = fs::read_to_string("tests/test2.lua").expect("failed to read turtle source");

    let mut simulation = Simulation::new();

    simulation
        .add_turtle(source1.clone(), Some("turtle 1"), (1, 2, 3), Heading::North)
        .expect("failed to add turtle 1");
    // simulation
    //     .add_turtle(source2.clone(), (0, 0, -2), Heading::South)
    //     .expect("failed to add turtle 2");

    // let turtle2 = Turtle::new(source2, (1, 0, 0), Heading::North);
    // simulation.add_turtle(turtle2);

    let start_inst = Instant::now();
    while !simulation.all_done().unwrap() {
        // let step_inst = Instant::now();
        match simulation.step() {
            Err(err) => {
                eprintln!(
                    "An error occured while running simulation:\n{}",
                    err.to_string()
                );
            }
            Ok(()) => {}
        }
        // let step_time = step_inst.elapsed();
        // println!("step (in {}us)", step_time.as_micros());
    }
    let run_time = start_inst.elapsed();

    let state = simulation.state.borrow();
    println!(
        "\nsimulation clock is {}ms at the end of execution\nran in {}us",
        state.clock,
        run_time.as_micros()
    )

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
