const express = require("express");
const db = require("../Config/db");
const exportexcel = require("../utils/excelexport");

exports.addnewcustomer = async (req, res) => {
  try {
    const { name, vehicle, description, contact, amount, location } = req.body;
    
    // Check if customer already exists
    const checkSql = "SELECT COUNT(*) as count FROM customers WHERE name = ?";
    db.get(checkSql, [name], (err, row) => {
      if (err) {
        console.error("Error checking customer:", err);
        return res.status(500).json({ Message: "Error checking customer" });
      }
      
      if (row && row.count > 0) {
        return res.status(400).json({ Message: "Customer already exists" });
      }
      
      // Insert new customer
      const customerData = {
        name: name || "N/A",
        vehicle: vehicle || "N/A", 
        description: description || "New customer",
        date: new Date().toISOString().split('T')[0], // Current date
        contact: contact || "To be updated",
        amount: amount || 0,
        location: location || "N/A"
      };
      
      const insertSql = `INSERT INTO customers (name, vehicle, description, date, contact, amount, location) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      db.run(insertSql, Object.values(customerData), function(insertErr) {
        if (insertErr) {
          console.error("Error inserting customer:", insertErr);
          return res.status(500).json({ Message: "Error creating customer" });
        }
        
        res.json({ 
          Message: "Customer created successfully",
          customerId: this.lastID,
          customer: customerData
        });
      });
    });
    
  } catch (error) {
    console.error("Error in addnewcustomer:", error);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

exports.insertdata = async (req, res) => {
  try {
    // Extract data from request body
    const {
      names,
      vehicles,
      descriptions,
      dates,
      contacts,
      amounts,
      locations,
    } = req.body;

    // Ensure all required fields are present
    if (
      !names ||
      !vehicles ||
      !descriptions ||
      !dates ||
      !contacts ||
      !amounts ||
      !locations
    ) {
      return res.status(400).json({ Message: "All fields are required" });
    }

    // Execute the query
    const query = `
      INSERT INTO customers (name, vehicle, description, date, contact, amount, location)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [
      names,
      vehicles,
      descriptions,
      dates,
      contacts,
      amounts,
      locations,
    ], function(err) {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ Message: "Internal Server Error" });
      }
      res.json({ Message: "Data has been saved" });
    });
  } catch (error) {
    // Handle errors
    console.error("Error inserting data:", error);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};

exports.getcusterexcel = async (req, res) => {
  var userid = req.params.id;
  db.all("SELECT * FROM customers WHERE id = ?", [userid], (err, rows) => {
    if (err) {
      console.error("Error executing query", err);
      return res.status(500).json({ Message: "Internal Server Error" });
    }
    exportexcel(res, rows, "users.xlsx");
  });
};

exports.chartdata = async (req, res) => {
  const { startDate, endDate } = req.query;

  // SQL query to filter data by date range
  const query = `
    SELECT date, COUNT(*) as count
    FROM customers
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date ASC
  `;
  db.all(query, [startDate, endDate], (err, results) => {
    if (err) {
      console.error("Error executing query", err);
      return res.status(500).json({ Message: "Internal Server Error" });
    }
    res.json(results);
  });
};

exports.getdata = async (req, res) => {
  db.all("SELECT * FROM customers", (err, rows) => {
    if (err) {
      console.error("Error executing query", err);
      return res.status(500).json({ Message: "Internal Server Error" });
    }
    // Return in the format expected by frontend
    res.json({ customers: rows });
  });
};

exports.deletedata = async (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM customers WHERE id = ?", [id], function(err) {
    if (err) {
      console.error("Error executing query", err);
      return res.status(500).json({ Message: "Internal Server Error" });
    }
    res.json({ Message: "Deleted successfully" });
  });
};

exports.updatedata = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, vehicle, description, date, contact, amount, location } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ Message: "Customer name is required" });
    }

    const query = `
      UPDATE customers
      SET name = ?, vehicle = ?, description = ?, date = ?, contact = ?, amount = ?, location = ?
      WHERE id = ?
    `;

    db.run(
      query,
      [name, vehicle || "N/A", description || "", date || new Date().toISOString().split('T')[0], contact || "", amount || 0, location || "", id],
      function(err) {
        if (err) {
          console.error("Error executing query", err);
          return res.status(500).json({
            Message: "Internal Server Error",
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            Message: "Customer not found",
          });
        }

        res.json({
          Message: "Customer updated successfully",
          customerId: id
        });
      }
    );
  } catch (error) {
    console.error("Error in updatedata:", error);
    res.status(500).json({ Message: "Internal Server Error" });
  }
};
