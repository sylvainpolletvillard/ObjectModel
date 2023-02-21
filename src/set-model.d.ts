import { FromDefinition, ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface SetModel<D extends ModelDefinition> extends Model<D> {
	(set: Set<FromDefinition<D>> | FromDefinition<D>[]): Set<FromDefinition<D>>;
	new(set: Set<FromDefinition<D>> | FromDefinition<D>[]): Set<FromDefinition<D>>;

	extend<E extends ModelDefinition[]>(...extensions: E): SetModel<E extends [] ? D : [D, ...E]>
	defaultTo<Default extends Set<FromDefinition<D>>>(defaultValue: Default): SetModelWithDefault<D, Default>;
}

export interface SetModelWithDefault<D, Default> extends SetModel<D> {
	(): Default
	new(): Default
}

export interface SetModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
}

export const SetModel: SetModelConstructor;