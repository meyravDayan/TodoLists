const express = require("express");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// mongoDB uri:
const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.osw5jzt.mongodb.net/ToDoListDB?retryWrites=true&w=majority`;
mongoose.connect(uri, { useNewURLParser: true, useUnifiedTopology: true }).then(
  app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
}));

const itemSchema = mongoose.Schema({ name: String });
const Item = mongoose.model("Item", itemSchema);
const item1 = new Item({ name: "Welcome to your todo list!" });
const item2 = new Item({ name: "Hit the + button to add a new item" });
const item3 = new Item({ name: "<-- Hit this to delete an item" });
const defaultItems = [item1, item2, item3];

const listSchema = mongoose.Schema({ name: String, items: [itemSchema] });
const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
    const day = date.getDate();
    Item.find()
        .then((items) => {
            if (items.length === 0) {
                Item.insertMany(defaultItems)
                    .then(() => {
                        console.log("Items added successfuly");
                    })
                    .catch((err) => {
                        console.log("Error was catched!!!!");
                        console.log(err);
                    });
                res.redirect("/");
            } else {
                res.render("list", { listTitle: day, newListItems: items });
            }
        })
        .catch((err) => {
            console.log(err);
        });
});

app.get("/:customListName", (req, res) => {
    const listName = _.capitalize(req.params.customListName);
    List.findOne({ name: listName })
        .then((foundList) => {
            if (foundList) {
                // render the list
                res.render("list", {
                    listTitle: foundList.name,
                    newListItems: foundList.items,
                });
            } else {
                // Create a new List and redirect
                const list = new List({
                    name: listName,
                    items: defaultItems,
                });
                list.save()
                    .then((list) => res.redirect(`/${list.name}`))
                    .catch((err) => console.log(err));
            }
        })
        .catch((err) => console.log(err));
});

app.post("/", function (req, res) {
    const itemName = req.body.newItem;
    const listName = req.body.list;
    const newItem = new Item({ name: itemName });

    if (listName === date.getDate()) {
        // save to today's list
        newItem
            .save()
            .then((item) => res.redirect("/"))
            .catch((err) => {
                console.log(err);
                res.redirect("/");
            });
    } else {
        // save to custom list
        List.findOne({ name: listName })
            .then((foundList) => {
                foundList.items.push(newItem);
                foundList
                    .save()
                    .then(res.redirect(`/${listName}`))
                    .catch((err) => console.log(err));
            })
            .catch((err) => console.log(err));
    }
});

app.post("/delete", function (req, res) {
    const itemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === date.getDate()) {
        // delete from origin list and redirect to home route
        Item.findByIdAndRemove(itemId)
            .then((item) => {
                res.redirect("/");
            })
            .catch((err) => {
                console.log(err);
                res.redirect("/");
            });
    } else {
        // find the list to delete from and redirect to it
        List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: { _id: itemId } } }
        )
            .then((foundList) => {
                res.redirect(`/${listName}`);
            })
            .catch((err) => console.log(err));
    }
});

app.get("/about", function (req, res) {
    res.render("about");
});

