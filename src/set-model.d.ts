import { FromDefinition, ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface SetModel<D extends ModelDefinition> extends Model<D> {
	(set: Set<any> | any[]): Set<FromDefinition<D>>;
	new(set: Set<any> | any[]): Set<FromDefinition<D>>;

	extend(...otherElementDefinitions: Array<any>): this;
}

export interface SetModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
}

export const SetModel: SetModelConstructor;