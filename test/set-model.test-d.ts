import {expectType} from 'tsd';
import { ObjectModel } from '../src/object-model';
import { SetModel } from '../src/set-model';

expectType<Set<string>>(SetModel(String)(new Set(["one", "two"])));

const Question = ObjectModel({
    answer: Number
});

const Quiz = SetModel([Question, String, Boolean]);

expectType<Set<{ answer: number } | string | boolean>>(Quiz(new Set()));

const SetModel1 = SetModel(String)
const SetModel2 = SetModel1.extend(Date, Number)
expectType<Set<string | Date | number>>(SetModel2([1,"2",new Date()]))