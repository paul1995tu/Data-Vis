import { Component, createEffect, createSignal, onMount } from "solid-js";
import * as d3 from "d3";

import "./App.scss";

import _airports from "src/assets/airports.csv";
import _flights from "src/assets/flights-airport-5000plus.csv";

const flights: Flight[] = _flights.map((f: any) => ({
    ...f,
    count: Number(f.count),
}));

const airports: Airport[] = _airports
    // Remove airports without flights
    .filter((a: any) => (a: any) => !!flights.find((f) => f.origin === a.iata || f.destination === a.iata))
    // Convert lat and long from string to number
    .map((a: any) => ({
        ...a,
        latitude: Number(a.latitude),
        longitude: Number(a.longitude),
    }));

const flightMap: { [iata: string]: number } = {};
for (const flight of flights) {
    flightMap[flight.origin] ??= 0;
    flightMap[flight.origin] += flight.count;
    flightMap[flight.destination] ??= 0;
    flightMap[flight.destination] += flight.count;
}
const airportsWithTotal: AirportWithTotalFlights[] = airports
    .map((a) => ({ ...a, flights: flightMap[a.iata] || 0 }))
    .filter((a) => a.flights > 0);

// Collect states from airports
const states = [...new Set(airports.map((a) => a.state))];

interface Airport {
    iata: string;
    name: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
}

interface AirportWithTotalFlights extends Airport {
    flights: number;
}

interface Flight {
    origin: string;
    destination: string;
    count: number;
}

const width = 1280;
const height = 720;

const min = d3.min(flights, (f) => Number(f.count)) as number;
const max = d3.max(flights, (f) => Number(f.count)) as number;

const links = flights.map((flight) => ({
    source: flight.origin,
    target: flight.destination,
    count: Number(flight.count),
}));

// Scales
const scaleFlightCount = d3.scaleLinear().domain([min, max]).range([1, 10]);
const scaleTotalFlights = d3
    .scaleLinear()
    .domain([
        d3.min(airportsWithTotal, (n) => n.flights) as number,
        d3.max(airportsWithTotal, (a) => a.flights) as number,
    ])
    .range([3, 10]);

// Assign color to each state on the BuGn color scale
const scaleState = d3
    .scaleOrdinal()
    .domain(states)
    .range(states.map((_, i, s) => d3.interpolateBuGn(i / s.length)));

const scaleLatitude = d3.scaleLinear().domain([24.2, 49.8]).range([height, 0]);

const scaleLongitude = d3.scaleLinear().domain([-66.5, -125.5]).range([width, 0]);

// Forces for forcebased layout
const forceNode = d3.forceManyBody().strength(-50); // Push nodes away from each other
const forceLink = d3
    .forceLink(links)
    .id((d) => d.iata)
    .distance(50);
const forceCenter = d3.forceCenter(width / 2, height / 2);

// Positional force for mapbased layout
const forceX = d3.forceX((d) => scaleLongitude(d.longitude));
const forceY = d3.forceY((d) => scaleLatitude(d.latitude));

// Draggability
function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
}

function dragged(event: any) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
}

function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0.7);
    event.subject.fx = null;
    event.subject.fy = null;
}

const drag = d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);

// Start building SVG
const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]).attr("class", "graphic");

// Add links (aka flights)
const link = svg
    .append("g")
    .attr("stroke", "#aaa")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke-width", (d) => scaleFlightCount(Number(d.count)));

// Add nodes (aka airports)
const node = svg
    .append("g")
    .attr("stroke", "black")
    .attr("stroke-width", 1.5)
    .attr("fill", "white")
    .selectAll("circle")
    .data(airportsWithTotal)
    .join("circle")
    .attr("r", (d) => scaleTotalFlights(d.flights))
    .attr("fill", (d) => scaleState(d.state))
    .call(drag);

// Add tooltips
node.append("title").text((d) => `${d.iata} (${d.name})`);

// Update svg according to force simulation every tick
function ticked() {
    link.attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
}

// Force simulation
const simulation = d3
    .forceSimulation(airportsWithTotal)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", forceCenter)
    .force("x", null)
    .force("y", null)
    .on("tick", ticked);

const App: Component = () => {
    const [toggleMap, setToggleMap] = createSignal<boolean>(false);

    createEffect(() => {
        simulation
            .force("link", toggleMap() ? null : forceLink)
            .force("charge", toggleMap() ? null : forceNode)
            .force("center", toggleMap() ? null : forceCenter)
            .force("x", toggleMap() ? forceX : null)
            .force("y", toggleMap() ? forceY : null);
        simulation.alphaTarget(1).restart();
    });

    let ref: HTMLDivElement;

    onMount(() => {
        ref.appendChild(svg.node());
    });

    return (
        <>
            <button onClick={() => setToggleMap((t) => !t)}>Toggle</button>
            <div ref={ref!}></div>;
        </>
    );
};

export default App;
