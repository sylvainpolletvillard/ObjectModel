import { ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface SetModel<D extends ModelDefinition> extends Model<D> {
	(set: Set<any> | any[]): Set<any>;
	new(set: Set<any> | any[]): Set<any>;

	extend(...otherElementDefinitions: Array<any>): this;
}

export interface SetModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
}

export const SetModel: SetModelConstructor;