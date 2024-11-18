const express = require('express');
const app = express();
const port = 3000;

// Import the database module
const db = require('./db');

// Middleware to parse JSON bodies
app.use(express.json());

// Allowed priorities
const allowedPriorities = ["high", "medium", "low"];

// GET /todos - Retrieve all to-do items or filter by completion status
app.get('/todos', (req, res) => {
    const completedQuery = req.query.completed;

    let sql = 'SELECT * FROM todos';
    const params = [];

    if (completedQuery !== undefined) {
        sql += ' WHERE completed = ?';
        const completed = completedQuery.toLowerCase() === 'true' ? 1 : 0;
        params.push(completed);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        // Convert 'completed' from INTEGER to BOOLEAN
        const todos = rows.map(row => ({
            ...row,
            completed: row.completed === 1
        }));
        res.json(todos);
    });
});

// POST /todos - Add a new to-do item
app.post('/todos', (req, res) => {
    const { task, priority } = req.body;

    if (!task) {
        return res.status(400).send("Task is required.");
    }

    const todoPriority = priority || 'medium';

    if (!allowedPriorities.includes(todoPriority)) {
        return res.status(400).send("Invalid priority value.");
    }

    const sql = 'INSERT INTO todos (task, priority) VALUES (?, ?)';
    const params = [task, todoPriority];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.status(201).json({
            id: this.lastID,
            task,
            priority: todoPriority,
            completed: false
        });
    });
});

// PUT /todos/:id - Update an existing to-do item
app.put('/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { task, priority, completed } = req.body;

    if (priority && !allowedPriorities.includes(priority)) {
        return res.status(400).send("Invalid priority value.");
    }

    // Build the SQL query dynamically based on provided fields
    let sql = 'UPDATE todos SET ';
    const fields = [];
    const params = [];

    if (task !== undefined) {
        fields.push('task = ?');
        params.push(task);
    }
    if (priority !== undefined) {
        fields.push('priority = ?');
        params.push(priority);
    }
    if (completed !== undefined) {
        fields.push('completed = ?');
        params.push(completed === true || completed === 'true' ? 1 : 0);
    }

    if (fields.length === 0) {
        return res.status(400).send("No valid fields to update.");
    }

    sql += fields.join(', ') + ' WHERE id = ?';
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (this.changes === 0) {
            return res.status(404).send("To-Do item not found");
        }
        res.json({ message: "To-Do item updated successfully." });
    });
});

// PUT /todos/complete-all - Mark all to-do items as completed
app.put('/todos/complete-all', (req, res) => {
    const sql = 'UPDATE todos SET completed = 1';

    db.run(sql, function(err) {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.json({ message: "All to-do items marked as completed." });
    });
});

// DELETE /todos/:id - Delete a to-do item
app.delete('/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);

    const sql = 'DELETE FROM todos WHERE id = ?';

    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (this.changes === 0) {
            return res.status(404).send("To-Do item not found");
        }
        res.status(204).send();
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


