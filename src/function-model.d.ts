import { FromDefinition, ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

type FromArgsDef<T> = T extends [infer A, ...infer Rest] ? [FromDefinition<A>, ...FromArgsDef<Rest>] : T

type FunctionSignature<Args extends any[], Return> = {
	(...args: FromArgsDef<Args>): FromDefinition<Return>
} 

export interface FunctionModel<Args extends ModelDefinition[], Return extends ModelDefinition> extends Model<{ arguments: Args, return: Return }> {
	(): FunctionSignature<Args, Return>;
	(fn: FunctionSignature<Args, Return>): FunctionSignature<Args, Return>;
	new (fn: FunctionSignature<Args, Return>): FunctionSignature<Args, Return>;
	definition: { arguments: Args, return: Return };

	return<R extends ModelDefinition>(returnValueDefinition: R): FunctionModel<Args, R>;
}

export interface FunctionModelConstructor {
	<Args extends ModelDefinition[]>(...argumentsDefinitions: Args): FunctionModel<Args, any>;
	new<Args extends ModelDefinition[]>(...argumentsDefinitions: Args): FunctionModel<Args, any>;
}

export const FunctionModel: FunctionModelConstructor;