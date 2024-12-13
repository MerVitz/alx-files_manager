import request from 'supertest';
import app from '../../app.js';

describe('File Endpoints', () => {
  it('should upload a file', async () => {
    const res = await request(app)
      .post('/files')
      .send({
        name: 'example.png',
        type: 'image',
        data: 'base64EncodedData',
      })
      .set('X-Token', 'userToken');
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('should retrieve a file', async () => {
    const fileId = 'fileId';
    const res = await request(app)
      .get(`/files/${fileId}/data`)
      .set('X-Token', 'userToken');
    expect(res.statusCode).toBe(200);
  });
});
