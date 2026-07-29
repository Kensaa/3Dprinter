use clap::{Parser, arg};
use std::{eprintln, format, process, time::Instant};
use url::Url;

use crate::{simulation::Simulation, turtle::TurtleBuilder, utils::Heading};

mod cc_api;
mod content_reader;
mod filesystem;
mod simulation;
mod turtle;
mod utils;
mod world;

#[derive(Parser)]
struct Cli {
    /// The name of the client file
    client: String,

    /// The number of turtle to create
    #[arg(default_value = "5")]
    turtle_count: usize,

    /// The address of the server from which to get the client file
    #[arg(default_value = "http://localhost:9513")]
    server_address: String,
}

fn main() {
    let Cli {
        client,
        turtle_count,
        server_address,
    } = Cli::parse();

    let server_address = match Url::parse(&server_address) {
        Ok(server_address) => server_address,
        Err(err) => {
            eprintln!("failed to parse server url : {}", err.to_string());
            process::exit(1);
        }
    };
    let source_address = server_address.join(&format!("clients/{client}")).unwrap();
    let source = match ureq::get(source_address.to_string()).call() {
        Ok(res) => res.into_body().read_to_string().unwrap(),
        Err(err) => {
            eprintln!("failed to fetch source : {}", err.to_string());
            process::exit(1);
        }
    };

    let mut simulation = Simulation::new();

    for i in 0..turtle_count {
        simulation
            .add_turtle(
                source.clone(),
                TurtleBuilder::new()
                    .with_label(format!("printer {i}"))
                    .with_position((i as isize, 0, 0))
                    .with_heading(Heading::North)
                    .build(),
            )
            .unwrap();
    }

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
}
