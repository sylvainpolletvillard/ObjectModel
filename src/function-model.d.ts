import { ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface FunctionModel<Args extends ModelDefinition[], Return extends ModelDefinition> extends Model<{ arguments: Args, return: Return }> {
	(): Function;
	new(): Function;
	(fn: Function): Function;
	new(fn: Function): Function;

	definition: { arguments: Args, return: Return };

	return<R extends ModelDefinition>(returnValueDefinition: any): FunctionModel<Args, R>;

	extend(otherArgsDefinitions: any[], otherReturnValuesDefinitions: any[]): this;
}

export interface FunctionModelConstructor {
	<Args extends ModelDefinition[]>(...argumentsDefinitions: any[]): FunctionModel<Args, any>;
	new<Args extends ModelDefinition[]>(...argumentsDefinitions: any[]): FunctionModel<Args, any>;
}

export const FunctionModel: FunctionModelConstructor;