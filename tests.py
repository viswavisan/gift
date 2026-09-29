import unittest
import json
import os
import sqlite3
from app import app, DB_FILE

class GiftAppTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()
        
        # We will use a clean test database file for safety, but verify SQLite operations
        self.test_db = 'test_gifts.db'
        # Override the database file in app module
        import app as app_module
        self.original_db = app_module.DB_FILE
        app_module.DB_FILE = self.test_db
        app_module.init_db()

    def tearDown(self):
        # Clean up test database
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except PermissionError:
                pass
        
        # Restore original DB file setting
        import app as app_module
        app_module.DB_FILE = self.original_db

    def test_home_page(self):
        """Test that the creator home page loads successfully."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'GiftGenerator', response.data)
        self.assertIn(b'Customize Your Gift', response.data)

    def test_create_gift_success(self):
        """Test successful gift link generation."""
        payload = {
            'recipient': 'Alice Test',
            'occasion': 'Birthday',
            'message': 'Happy Birthday Alice!'
        }
        response = self.client.post(
            '/create',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('gift_id', data)
        self.assertIn('gift_url', data)
        self.assertIn('ref_code', data)
        self.assertEqual(len(data['ref_code']), 6)

        # Verify DB entry directly (defaults to Pending Selection)
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        row = conn.execute('SELECT * FROM gifts WHERE id = ?', (data['gift_id'],)).fetchone()
        conn.close()
        
        self.assertIsNotNone(row)
        self.assertEqual(row['recipient'], 'Alice Test')
        self.assertEqual(row['occasion'], 'Birthday')
        self.assertEqual(row['gift_item'], 'Pending Selection')
        self.assertEqual(row['message'], 'Happy Birthday Alice!')

    def test_create_gift_missing_fields(self):
        """Test validation error when required fields are missing."""
        payload = {
            'recipient': '',
            'message': 'Test message'
        }
        response = self.client.post(
            '/create',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_select_gift_success(self):
        """Test receiver gift selection callback updates database."""
        conn = sqlite3.connect(self.test_db)
        gift_id = 'test-uuid-select'
        conn.execute(
            'INSERT INTO gifts (id, recipient, occasion, wrap_style, gift_item, message) VALUES (?, ?, ?, ?, ?, ?)',
            (gift_id, 'Bob Test', 'Birthday', 'wrap', 'Pending Selection', 'Hello Bob!')
        )
        conn.commit()
        conn.close()

        payload = {'gift_item': 'ps5'}
        response = self.client.post(
            f'/select/{gift_id}',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

        # Verify row updated in DB
        conn = sqlite3.connect(self.test_db)
        row = conn.execute('SELECT gift_item FROM gifts WHERE id = ?', (gift_id,)).fetchone()
        conn.close()
        self.assertEqual(row[0], 'ps5')

    def test_view_status_success(self):
        """Test checking the tracking status page."""
        conn = sqlite3.connect(self.test_db)
        gift_id = 'test-uuid-status'
        conn.execute(
            'INSERT INTO gifts (id, recipient, occasion, wrap_style, gift_item, message) VALUES (?, ?, ?, ?, ?, ?)',
            (gift_id, 'Bob Test', 'Anniversary', 'wrap', 'Pending Selection', 'Happy Anniversary Bob!')
        )
        conn.commit()
        conn.close()

        # Step 1: Check pending state
        response = self.client.get(f'/status/{gift_id}')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Pending Selection', response.data)
        self.assertIn(b'Bob Test', response.data)

        # Step 2: Set selection
        conn = sqlite3.connect(self.test_db)
        conn.execute('UPDATE gifts SET gift_item = ? WHERE id = ?', ('iphone', gift_id))
        conn.commit()
        conn.close()

        # Step 3: Check updated state
        response = self.client.get(f'/status/{gift_id}')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Claimed & Opened', response.data)
        self.assertIn(b'iPhone 15 Pro Max', response.data)

    def test_view_gift_not_found(self):
        """Test fetching a non-existent gift ID returns 404."""
        response = self.client.get('/gift/non-existent-id')
        self.assertEqual(response.status_code, 404)

    def test_create_gift_with_presenter_options(self):
        """Test creating a gift with presenter-specified custom options, specs, and Amazon links."""
        payload = {
            'recipient': 'Charlie',
            'occasion': 'Graduation',
            'message': 'Congrats on graduating!',
            'options': [
                {
                    'title': 'Mechanical Keyboard',
                    'image_url': '/static/images/custom_kb.png',
                    'specs': 'RGB Backlit • Blue Switches • Wireless',
                    'amazon_link': 'https://www.amazon.com/dp/B0EXAMPLE1'
                },
                {
                    'title': 'Noise Cancelling Headphones',
                    'image_url': '/static/images/custom_headphones.png',
                    'specs': 'Over-ear • 40hr Battery • ANC',
                    'amazon_link': 'https://www.amazon.com/dp/B0EXAMPLE2'
                }
            ]
        }
        response = self.client.post(
            '/create',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        gift_id = data['gift_id']

        # Verify DB entries in gift_options
        conn = sqlite3.connect(self.test_db)
        conn.row_factory = sqlite3.Row
        opts = conn.execute('SELECT * FROM gift_options WHERE gift_id = ? ORDER BY id ASC', (gift_id,)).fetchall()
        conn.close()

        self.assertEqual(len(opts), 2)
        self.assertEqual(opts[0]['title'], 'Mechanical Keyboard')
        self.assertEqual(opts[0]['specs'], 'RGB Backlit • Blue Switches • Wireless')
        self.assertEqual(opts[0]['amazon_link'], 'https://www.amazon.com/dp/B0EXAMPLE1')
        self.assertEqual(opts[1]['title'], 'Noise Cancelling Headphones')

        # Test view gift renders custom options
        gift_page = self.client.get(f'/gift/{gift_id}')
        self.assertEqual(gift_page.status_code, 200)
        self.assertIn(b'Mechanical Keyboard', gift_page.data)
        self.assertIn(b'Noise Cancelling Headphones', gift_page.data)
        self.assertIn(b'RGB Backlit', gift_page.data)
        self.assertIn(b'https://www.amazon.com/dp/B0EXAMPLE1', gift_page.data)

        # Test view status in pending state shows offered choices
        status_page = self.client.get(f'/status/{gift_id}')
        self.assertEqual(status_page.status_code, 200)
        self.assertIn(b'Mechanical Keyboard', status_page.data)
        self.assertIn(b'Choices You Offered', status_page.data)

        # Test recipient selecting one of the options
        sel_resp = self.client.post(
            f'/select/{gift_id}',
            data=json.dumps({'gift_item': 'Mechanical Keyboard'}),
            content_type='application/json'
        )
        self.assertEqual(sel_resp.status_code, 200)

        # Test status page updated with claimed option and Amazon CTA
        claimed_status = self.client.get(f'/status/{gift_id}')
        self.assertEqual(claimed_status.status_code, 200)
        self.assertIn(b'Mechanical Keyboard', claimed_status.data)
        self.assertIn(b'Purchase on Amazon for Charlie', claimed_status.data)
        self.assertIn(b'https://www.amazon.com/dp/B0EXAMPLE1', claimed_status.data)

    def test_upload_image_endpoint(self):
        """Test uploading an image file to /upload-image."""
        import io
        fake_image = (io.BytesIO(b'fake png content data'), 'test_gift.png')
        response = self.client.post(
            '/upload-image',
            data={'image': fake_image},
            content_type='multipart/form-data'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertTrue(data['image_url'].startswith('/static/uploads/'))
        self.assertTrue(data['image_url'].endswith('.png'))

        # Clean up uploaded file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(data['image_url']))
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass

    def test_create_gift_with_flipkart_link(self):
        """Test creating a gift with Flipkart link, verifying Flipkart badge and purchase CTA."""
        payload = {
            'recipient': 'Priya',
            'occasion': 'Birthday',
            'message': 'Happy Birthday Priya!',
            'options': [
                {
                    'title': 'Smart Fitness Watch',
                    'image_url': '/static/images/watch.png',
                    'specs': 'AMOLED Display • SpO2 • 7-day battery',
                    'amazon_link': 'https://www.flipkart.com/smart-watch/p/itm1234567'
                }
            ]
        }
        response = self.client.post(
            '/create',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        gift_id = data['gift_id']

        # Verify gift page displays Flipkart link
        gift_page = self.client.get(f'/gift/{gift_id}')
        self.assertEqual(gift_page.status_code, 200)
        self.assertIn(b'Flipkart Link', gift_page.data)
        self.assertIn(b'https://www.flipkart.com/smart-watch/p/itm1234567', gift_page.data)

        # Select option
        self.client.post(
            f'/select/{gift_id}',
            data=json.dumps({'gift_item': 'Smart Fitness Watch'}),
            content_type='application/json'
        )

        # Verify status page displays "Purchase on Flipkart for Priya"
        status_page = self.client.get(f'/status/{gift_id}')
        self.assertEqual(status_page.status_code, 200)
        self.assertIn(b'Purchase on Flipkart for Priya', status_page.data)
        self.assertIn(b'https://www.flipkart.com/smart-watch/p/itm1234567', status_page.data)

if __name__ == '__main__':
    unittest.main()


