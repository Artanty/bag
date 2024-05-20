const pool = require('./../core/db_connection')

class BaseCRUD {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async create(data) {
    const sql = `INSERT INTO ${this.tableName} SET ?`;
    const [result] = await pool.query(sql, data);
    return result;
  }

  async read(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const [record] = await pool.query(sql, [id]);
    
    if (!Object.keys(record).length) {
      throw new Error('Record not found')
    }

    return record;
  }

  async readAll() {
    const sql = `SELECT * FROM ${this.tableName}`;
    const [record] = await pool.query(sql);

    return record;
  }

  async update(id, data) {
    const sql = `UPDATE ${this.tableName} SET ? WHERE id = ?`;
    const [result] = await pool.query(sql, [data, id]);
    if (result.affectedRows === 0) {
      throw new Error('Record not found')
    }
    return result;
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) {
      throw new Error('Record not found')
    }
    return result;
  }

  // API functions
  createAPI(req, res) {
    this.create(req.body)
      .then(result => res.status(201).json({ message: 'Record created successfully', id: result.insertId }))
      .catch(error => res.status(500).json({ message: 'Error creating record', error }));
  }

  readAllAPI(req, res) {
    this.readAll()
    .then(result => res.status(201).json(result))
    .catch(error => this.handleError(res, error));
  }

  readAPI(req, res) {
    this.read(req.params.id)
      .then(record => res.json(record))
      .catch(error => this.handleError(res, error));
  }

  updateAPI(req, res) {
    this.update(req.params.id, req.body)
      .then(result => res.json({ message: 'Record updated successfully' }))
      .catch(error => this.handleError(res, error));
  }

  deleteAPI(req, res) {
    this.delete(req.params.id)
      .then(result => res.json({ message: 'Record deleted successfully' }))
      .catch(error => this.handleError(res, error));
  }

  handleError (res, e) {
    res.status(500).json(
      { 
        message: e instanceof Error ? e.message : String(e),
        error: true
      }
    )
  }
}

module.exports = BaseCRUD;