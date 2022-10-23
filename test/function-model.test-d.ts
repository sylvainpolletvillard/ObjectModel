import {expectError, expectType} from 'tsd';
import { FunctionModel } from '../types';

const F1 = FunctionModel(Number, String).return(Boolean);
const f1 = F1((n,s) => +s === n);

expectType<(a: number, b: string) => boolean>(f1)
expectType<boolean>(f1(1, "test"))

expectError(f1("test", 2))

expectError(f1(0)) 
