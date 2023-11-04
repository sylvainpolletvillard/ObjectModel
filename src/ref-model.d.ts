export interface RefModel {	
	definition: undefined;

	toString(stack?: any[]): string;
}

export interface RefModelConstructor {
	(key: String | Symbol): RefModel;
	new(key: String | Symbol): RefModel;
}

export const RefModel: RefModelConstructor;
