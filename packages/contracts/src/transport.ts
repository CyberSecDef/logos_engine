// Transient diagnostics from one deterministic engine step. These are not saved
// world state and must never be substituted for committed replay history.
export interface WaterTransfer {
 fromTileId:number;toTileId:number;waterL:number;sedimentKg:number;
}
export interface WaterBudget {
 tileId:number;
 beforeWaterL:number;rainL:number;evaporationL:number;mixingWaterL:number;
 incomingWaterL:number;outgoingWaterL:number;oceanDrainL:number;afterWaterL:number;
 beforeSedimentKg:number;incomingSedimentKg:number;outgoingSedimentKg:number;afterSedimentKg:number;
}
export interface WaterTransportReport {
 worldId:string;sourceRevision:number;sourceTick:number;tick:number;
 tiles:WaterBudget[];transfers:WaterTransfer[];
}
export interface WaterPreview {
 worldId:string;sourceRevision:number;sourceTick:number;tick:number;
 tileId:number;areaM2:number;budget:WaterBudget;
 incoming:WaterTransfer[];outgoing:WaterTransfer[];
}
