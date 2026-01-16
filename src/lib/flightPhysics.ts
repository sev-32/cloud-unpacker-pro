/**
 * Advanced Flight Simulation Physics Engine
 * Full aerodynamic model with lift, drag, thrust, and realistic handling
 */

// Physical constants
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const GRAVITY = 9.81; // m/s²
const LAPSE_RATE = 0.0065; // K/m - temperature decrease with altitude
const TEMPERATURE_SEA_LEVEL = 288.15; // K (15°C)
const PRESSURE_SEA_LEVEL = 101325; // Pa
const GAS_CONSTANT = 287.05; // J/(kg·K)

export interface AircraftConfig {
  // Mass properties
  mass: number;           // kg
  inertia: [number, number, number]; // Moments of inertia [Ix, Iy, Iz]
  
  // Wing properties
  wingArea: number;       // m²
  wingSpan: number;       // m
  aspectRatio: number;    // Aspect ratio (span²/area)
  oswaldEfficiency: number; // Oswald efficiency factor (0.7-0.85)
  
  // Aerodynamic coefficients
  cl0: number;            // Zero-lift coefficient
  clAlpha: number;        // Lift curve slope (/rad)
  clMax: number;          // Maximum lift coefficient
  cd0: number;            // Parasitic drag coefficient
  cdFlaps: number;        // Flap drag increment
  
  // Control effectiveness
  elevatorEffectiveness: number;
  aileronEffectiveness: number;
  rudderEffectiveness: number;
  
  // Engine
  maxThrust: number;      // N
  throttleResponse: number; // Response rate (0-1 per second)
  
  // Control limits
  maxPitchRate: number;   // rad/s
  maxRollRate: number;    // rad/s
  maxYawRate: number;     // rad/s
  
  // Stall
  stallAngle: number;     // rad
  stallRecoveryRate: number; // How fast aircraft recovers from stall
  
  // Misc
  fuelCapacity: number;   // kg
  fuelBurnRate: number;   // kg/s at full thrust
}

export interface FlightState {
  // Position (world coordinates, meters)
  position: [number, number, number];
  
  // Velocity (world coordinates, m/s)
  velocity: [number, number, number];
  
  // Orientation (Euler angles, radians)
  pitch: number;  // rotation around X (nose up/down)
  roll: number;   // rotation around Z (banking)
  yaw: number;    // rotation around Y (heading)
  
  // Angular velocity (rad/s)
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  
  // Aircraft state
  throttle: number;         // 0-1
  currentThrust: number;    // N
  angleOfAttack: number;    // rad
  sideslipAngle: number;    // rad
  
  // Control inputs (-1 to 1)
  elevatorInput: number;
  aileronInput: number;
  rudderInput: number;
  
  // Flags
  stalling: boolean;
  onGround: boolean;
  gForce: number;
  
  // Stats
  airspeed: number;        // m/s
  altitude: number;        // m
  verticalSpeed: number;   // m/s
  heading: number;         // rad
  machNumber: number;
  fuel: number;            // kg remaining
}

export interface ControlInputs {
  pitch: number;    // -1 (down) to 1 (up)
  roll: number;     // -1 (left) to 1 (right)
  yaw: number;      // -1 (left) to 1 (right)
  throttle: number; // 0 to 1
  flaps: number;    // 0 to 1
  brake: boolean;
}

// Default jet configuration
export const DEFAULT_JET_CONFIG: AircraftConfig = {
  mass: 5000,
  inertia: [8000, 25000, 25000],
  wingArea: 25,
  wingSpan: 10,
  aspectRatio: 4,
  oswaldEfficiency: 0.8,
  cl0: 0.25,
  clAlpha: 5.5,
  clMax: 1.6,
  cd0: 0.025,
  cdFlaps: 0.03,
  elevatorEffectiveness: 2.5,
  aileronEffectiveness: 3.0,
  rudderEffectiveness: 1.5,
  maxThrust: 80000,
  throttleResponse: 0.8,
  maxPitchRate: 2.0,
  maxRollRate: 4.0,
  maxYawRate: 1.0,
  stallAngle: 0.28,
  stallRecoveryRate: 0.5,
  fuelCapacity: 2000,
  fuelBurnRate: 0.5,
};

// Initialize flight state
export function createInitialState(
  position: [number, number, number] = [0, 500, 0],
  heading: number = 0
): FlightState {
  return {
    position,
    velocity: [Math.sin(heading) * 100, 0, -Math.cos(heading) * 100],
    pitch: 0,
    roll: 0,
    yaw: heading,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    throttle: 0.5,
    currentThrust: 0,
    angleOfAttack: 0,
    sideslipAngle: 0,
    elevatorInput: 0,
    aileronInput: 0,
    rudderInput: 0,
    stalling: false,
    onGround: false,
    gForce: 1.0,
    airspeed: 100,
    altitude: position[1],
    verticalSpeed: 0,
    heading,
    machNumber: 0,
    fuel: 2000,
  };
}

// Vector utilities
function vec3Add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Scale(v: [number, number, number], s: number): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Length(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: [number, number, number]): [number, number, number] {
  const len = vec3Length(v);
  return len > 0.0001 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

function vec3Dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// Get aircraft body axes from orientation
function getBodyAxes(pitch: number, roll: number, yaw: number) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  
  // Forward (nose direction)
  const forward: [number, number, number] = [
    cy * cp,
    sp,
    -sy * cp,
  ];
  
  // Up (lift direction)
  const up: [number, number, number] = [
    cy * sp * sr - sy * cr,
    cp * sr,
    -sy * sp * sr - cy * cr,
  ];
  
  // Right (wing direction)
  const right: [number, number, number] = [
    cy * sp * cr + sy * sr,
    cp * cr,
    -sy * sp * cr + cy * sr,
  ];
  
  return { forward, up, right };
}

// Calculate air density at altitude (ISA model)
function getAirDensity(altitude: number): number {
  if (altitude < 0) altitude = 0;
  if (altitude > 11000) altitude = 11000; // Troposphere limit
  
  const temperature = TEMPERATURE_SEA_LEVEL - LAPSE_RATE * altitude;
  const pressure = PRESSURE_SEA_LEVEL * Math.pow(temperature / TEMPERATURE_SEA_LEVEL, GRAVITY / (LAPSE_RATE * GAS_CONSTANT));
  return pressure / (GAS_CONSTANT * temperature);
}

// Speed of sound at altitude
function getSpeedOfSound(altitude: number): number {
  const temperature = Math.max(216.65, TEMPERATURE_SEA_LEVEL - LAPSE_RATE * altitude);
  return Math.sqrt(1.4 * GAS_CONSTANT * temperature);
}

// Calculate lift coefficient with stall modeling
function getLiftCoefficient(aoa: number, config: AircraftConfig): number {
  const stallAngle = config.stallAngle;
  
  if (Math.abs(aoa) < stallAngle) {
    // Linear region
    return config.cl0 + config.clAlpha * aoa;
  } else {
    // Post-stall region (simplified)
    const sign = aoa > 0 ? 1 : -1;
    const postStallAOA = Math.abs(aoa) - stallAngle;
    const preStallCL = config.cl0 + config.clAlpha * sign * stallAngle;
    const reduction = 0.3 * postStallAOA;
    return Math.max(0.3, preStallCL - reduction) * sign;
  }
}

// Calculate drag coefficient (including induced drag)
function getDragCoefficient(cl: number, config: AircraftConfig, flaps: number): number {
  // Induced drag coefficient
  const cdi = (cl * cl) / (Math.PI * config.aspectRatio * config.oswaldEfficiency);
  
  // Total drag
  return config.cd0 + config.cdFlaps * flaps + cdi;
}

// Main physics update
export function updateFlightPhysics(
  state: FlightState,
  inputs: ControlInputs,
  config: AircraftConfig,
  dt: number,
  getTerrainHeight?: (x: number, z: number) => number
): FlightState {
  // Clamp dt to prevent instability
  dt = Math.min(dt, 0.05);
  
  // Get body axes
  const { forward, up, right } = getBodyAxes(state.pitch, state.roll, state.yaw);
  
  // Calculate airspeed (velocity relative to air, ignoring wind)
  const airspeed = vec3Length(state.velocity);
  const velocityDir = airspeed > 1 ? vec3Normalize(state.velocity) : forward;
  
  // Dynamic pressure
  const rho = getAirDensity(state.altitude);
  const q = 0.5 * rho * airspeed * airspeed;
  
  // Angle of attack and sideslip
  const velDotForward = vec3Dot(state.velocity, forward);
  const velDotUp = vec3Dot(state.velocity, up);
  const velDotRight = vec3Dot(state.velocity, right);
  
  const aoa = airspeed > 10 ? Math.atan2(-velDotUp, velDotForward) : 0;
  const sideslip = airspeed > 10 ? Math.atan2(velDotRight, velDotForward) : 0;
  
  // Check stall condition
  const stalling = Math.abs(aoa) > config.stallAngle;
  
  // Aerodynamic coefficients
  const cl = getLiftCoefficient(aoa, config);
  const cd = getDragCoefficient(cl, config, inputs.flaps);
  
  // Aerodynamic forces
  const liftMagnitude = cl * q * config.wingArea;
  const dragMagnitude = cd * q * config.wingArea;
  
  // Force directions
  const dragDir = vec3Scale(velocityDir, -1);
  const liftDir = up; // Simplified - perpendicular to velocity in vertical plane
  
  // Calculate forces
  const liftForce = vec3Scale(liftDir, liftMagnitude);
  const dragForce = vec3Scale(dragDir, dragMagnitude);
  
  // Thrust
  const targetThrust = inputs.throttle * config.maxThrust;
  const thrustDelta = (targetThrust - state.currentThrust) * config.throttleResponse * dt;
  const currentThrust = Math.max(0, state.currentThrust + thrustDelta);
  const thrustForce = vec3Scale(forward, currentThrust);
  
  // Gravity
  const gravityForce: [number, number, number] = [0, -config.mass * GRAVITY, 0];
  
  // Total force and acceleration
  const totalForce = vec3Add(vec3Add(vec3Add(liftForce, dragForce), thrustForce), gravityForce);
  const acceleration = vec3Scale(totalForce, 1 / config.mass);
  
  // Update velocity
  const newVelocity = vec3Add(state.velocity, vec3Scale(acceleration, dt));
  
  // Update position
  const newPosition = vec3Add(state.position, vec3Scale(state.velocity, dt));
  
  // Control moments (simplified stability derivatives)
  const controlTorquePitch = inputs.pitch * config.elevatorEffectiveness * q * config.wingArea * 0.01;
  const controlTorqueRoll = inputs.roll * config.aileronEffectiveness * q * config.wingArea * 0.01;
  const controlTorqueYaw = inputs.yaw * config.rudderEffectiveness * q * config.wingArea * 0.01;
  
  // Stability damping
  const pitchDamping = -state.pitchRate * 2.0;
  const rollDamping = -state.rollRate * 3.0;
  const yawDamping = -state.yawRate * 4.0;
  
  // Angular accelerations
  const pitchAccel = (controlTorquePitch + pitchDamping) / config.inertia[1];
  const rollAccel = (controlTorqueRoll + rollDamping) / config.inertia[0];
  const yawAccel = (controlTorqueYaw + yawDamping) / config.inertia[2];
  
  // Stall effects - reduce control authority and add instability
  const stallFactor = stalling ? 0.3 : 1.0;
  const stallInstability = stalling ? (Math.random() - 0.5) * 0.5 : 0;
  
  // Update angular velocities
  let newPitchRate = state.pitchRate + pitchAccel * dt * stallFactor + stallInstability;
  let newRollRate = state.rollRate + rollAccel * dt * stallFactor + stallInstability;
  let newYawRate = state.yawRate + yawAccel * dt * stallFactor;
  
  // Clamp angular rates
  newPitchRate = Math.max(-config.maxPitchRate, Math.min(config.maxPitchRate, newPitchRate));
  newRollRate = Math.max(-config.maxRollRate, Math.min(config.maxRollRate, newRollRate));
  newYawRate = Math.max(-config.maxYawRate, Math.min(config.maxYawRate, newYawRate));
  
  // Update orientation
  let newPitch = state.pitch + newPitchRate * dt;
  let newRoll = state.roll + newRollRate * dt;
  let newYaw = state.yaw + newYawRate * dt;
  
  // Normalize yaw to 0-2π
  newYaw = ((newYaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  
  // Ground collision
  let onGround = false;
  let terrainHeight = 0;
  if (getTerrainHeight) {
    terrainHeight = getTerrainHeight(newPosition[0], newPosition[2]);
  }
  
  if (newPosition[1] < terrainHeight + 5) {
    newPosition[1] = terrainHeight + 5;
    if (newVelocity[1] < 0) {
      newVelocity[1] = 0;
    }
    onGround = true;
    
    // Ground friction
    if (inputs.brake) {
      const groundSpeed = Math.sqrt(newVelocity[0] ** 2 + newVelocity[2] ** 2);
      if (groundSpeed > 0.1) {
        const friction = Math.min(groundSpeed, 50 * dt);
        newVelocity[0] *= (groundSpeed - friction) / groundSpeed;
        newVelocity[2] *= (groundSpeed - friction) / groundSpeed;
      }
    }
  }
  
  // Calculate G-force
  const gForce = 1 + (vec3Length(acceleration) / GRAVITY);
  
  // Fuel consumption
  const fuelBurn = state.throttle * config.fuelBurnRate * dt;
  const newFuel = Math.max(0, state.fuel - fuelBurn);
  
  // Speed of sound for Mach number
  const sos = getSpeedOfSound(state.altitude);
  const machNumber = airspeed / sos;
  
  return {
    ...state,
    position: newPosition,
    velocity: newVelocity,
    pitch: newPitch,
    roll: newRoll,
    yaw: newYaw,
    pitchRate: newPitchRate,
    rollRate: newRollRate,
    yawRate: newYawRate,
    throttle: inputs.throttle,
    currentThrust,
    angleOfAttack: aoa,
    sideslipAngle: sideslip,
    elevatorInput: inputs.pitch,
    aileronInput: inputs.roll,
    rudderInput: inputs.yaw,
    stalling,
    onGround,
    gForce,
    airspeed,
    altitude: newPosition[1],
    verticalSpeed: newVelocity[1],
    heading: newYaw,
    machNumber,
    fuel: newFuel,
  };
}

// Convert world scale to cloud renderer scale
export function toCloudScale(pos: [number, number, number], scale: number = 1): [number, number, number] {
  return [pos[0] * scale, pos[1] * scale, pos[2] * scale];
}
