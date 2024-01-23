//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}`);

const itemSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model('Item', itemSchema);

const item1 = new Item({
  name: "Todolist"
});

const item2 = new Item({
  name: "press +"
});

const item3 = new Item({
  name: "press to delete"
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const List = mongoose.model('List', listSchema);

app.get("/", async function (req, res) {
  try {
    const foundItems = await Item.find({}).lean();

    // Function to check for duplicates based on the 'name' property
    const hasDuplicates = (newItems, existingItems) => {
      const existingItemNames = existingItems.map(item => item.name);
      return newItems.some(item => !existingItemNames.includes(item.name));
    };

    // Check for duplicates before rendering
    if (hasDuplicates(defaultItems, foundItems)) {
      const newItems = defaultItems.filter(item => !foundItems.some(existingItem => existingItem.name === item.name));

      // Insert new items if they are not duplicates
      if (newItems.length > 0) {
        await Item.insertMany(newItems);
      }

      // Retrieve the updated list of items from the database after insertion
      const updatedItems = await Item.find({}).lean();
      res.render("list", { listTitle: "Today", newListItems: updatedItems });
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/", async function (req, res) {

  const itemName = req.body.newItem;
  const listIteam = req.body.list;
  
  const newItem = new Item({ name: itemName});

  try{
    if(listIteam === 'Today'){
      newItem.save();
      res.redirect("/");
    }else{
      
      const foundList = await List.findOne({name: listIteam});
      foundList.items.push(newItem);
      foundList.save();
      res.redirect("/" + listIteam);
    }
  }
  catch(err){
    console.log(err);
    res.status(500).send("internal error")
  }
  
});

app.post("/delete", async (req, res) => {

  const checkedBoxId = req.body.checkedbox;
  const listName = req.body.listName;

  try{
    if(listName === 'Today'){
      Item.findByIdAndDelete(checkedBoxId)
      .then(() => {
        res.redirect('/');
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Internal Server Error");
      });

    }
    else{
      await List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedBoxId}}});
      res.redirect("/" + listName);
    }
  }
  catch (err) {
    console.log(err);
  }
});

app.get("/:customListName", async function (req, res) {
  try {
    const customListName = _.capitalize(req.params.customListName);

    // Use await with findOne() to wait for the Promise to resolve
    let foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });

      // Use await with save() to wait for the save operation to complete
      await list.save();
      res.redirect('/' + customListName);
    } else {
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
