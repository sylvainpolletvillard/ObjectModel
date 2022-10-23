// TODO: https://stackoverflow.com/questions/49682569/typescript-merge-object-types
export type MergeObjects<objects extends object[]> = any; 

//from https://github.com/type-challenges/type-challenges/issues/17508
type TupleToUnion<T extends any[]> = T[number];