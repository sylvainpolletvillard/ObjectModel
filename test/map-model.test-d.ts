import {expectType} from 'tsd';
import { ObjectModel } from '../src/object-model';
import { MapModel } from '../src/map-model';

expectType<Map<number, boolean>>(MapModel(Number, Boolean)(new Map([[1, true],[2, false]])));

const Question = ObjectModel({ q: String })
const Response = ObjectModel({ r: String })

const Quiz = MapModel(Question, Response);

expectType<Map<{ q: string }, { r: string }>>(Quiz(new Map([])));