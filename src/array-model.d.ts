import { ModelDefinition, FromDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface ArrayModel<D> extends Model<D> {	
	(array: FromDefinition<D>[]): FromDefinition<D>[];
	new(array: FromDefinition<D>[]): FromDefinition<D>[];

	extend<E extends ModelDefinition[]>(...extensions: E): ArrayModel<E extends [] ? D : [D, ...E]>
	defaultTo<Default extends FromDefinition<D>>(defaultValue: Default): ArrayModelWithDefault<D, Default>;
}

export interface ArrayModelWithDefault<D, Default> extends ArrayModel<D> {
	(): Default
	new(): Default
}

export interface ArrayModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): ArrayModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): ArrayModel<D>;
}

export const ArrayModel: ArrayModelConstructor;