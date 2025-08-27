const express = require('express');
const db = require('../Config/db');
const exportexcel = require('../utils/excelexport');

exports.getcusterexcel = async (req, res) => {
    var userid = req.params.id;
    db.all('SELECT * FROM expenses WHERE id = ?', [userid], (err, rows) => {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        exportexcel(res, rows, 'expenses.xlsx');
    });
};

exports.postdata = async (req, res) => {
    try {
        const { name, vehicle, description, date, amount, payment_status } = req.body;
        if (!name || !vehicle || !description || !date || !amount || !payment_status) {
            return res.status(400).json({ Message: "All fields are required" });
        }
        const query = 'INSERT INTO expenses (name, vehicle, description, date, amount, payment_status) VALUES (?, ?, ?, ?, ?, ?)';
        db.run(query, [name, vehicle, description, date, amount, payment_status], function(err) {
            if (err) {
                console.error('Error inserting data:', err);
                return res.status(500).json({ Message: "Internal Server Error" });
            }
            res.json({ Message: "Data has been saved" });
        });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ Message: "Internal Server Error" });
    }
};

exports.getdata = async (req, res) => {
    db.all('SELECT * FROM expenses', (err, rows) => {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        res.json({ rows });
    });
};

exports.deletedata = async (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        res.json({ 'Message': 'deleted sucessfully' });
    });
};

exports.updatedata = async (req, res) => {
    const id = req.params.id;
    const { name, vehicle, description, date, amount, payment_status } = req.body;
    const query = `
        UPDATE expenses
        SET name = ?, vehicle = ?, description = ?, date = ?, amount = ?, payment_status = ?
        WHERE id = ?
    `;
    db.run(query, [name, vehicle, description, date, amount, payment_status, id], function(err) {
        if (err) {
            console.error('Error executing query', err);
            return res.status(500).json({ "Message": "Internal Server Error" });
        }
        if (this.changes === 0) {
            return res.status(404).json({ "Message": "Customer not found" });
        }
        res.json({ 'Message': 'Updated successfully' });
    });
};