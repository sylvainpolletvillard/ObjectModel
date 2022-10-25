import { ModelDefinition, FromDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface ArrayModel<D> extends Model<D> {	
	(array: any[]): Array<FromDefinition<D>>;
	new(array: any[]): Array<FromDefinition<D>>;

	extend<E extends ModelDefinition[]>(...extensions: E): ArrayModel<E extends [] ? D : [D, ...E]>
}

export interface ArrayModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): ArrayModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): ArrayModel<D>;
}

export const ArrayModel: ArrayModelConstructor;