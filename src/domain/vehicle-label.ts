export function vehicleLabel(vehicle:{vehicle_type:string;registration:string},registration=true) {
  return registration?`${vehicle.vehicle_type} · ${vehicle.registration}`:vehicle.vehicle_type
}
