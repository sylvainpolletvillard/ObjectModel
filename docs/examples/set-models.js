import { Model, SetModel } from "objectmodel";

const Course = Model(["math", "english", "history"]);

const FavoriteCourses = SetModel(Course);

const joannaFavorites = FavoriteCourses(["math", "english"]);

joannaFavorites.add("sleeping");
// TypeError: expecting Set value to be "math" or "english" or "history", got String "sleeping"
