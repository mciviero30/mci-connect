import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin and CEO can check integrations
    if (user?.role !== 'admin' && user?.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin/CEO access required' }, { status: 403 });
    }

    const results = [];

    // 1. DocuSign
    try {
      const docusignAccountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
      const docusignIntegrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
      const docusignSecretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
      
      results.push({
        name: 'DocuSign',
        status: (docusignAccountId && docusignIntegrationKey && docusignSecretKey) ? 'configured' : 'missing_keys',
        details: {
          account_id: docusignAccountId ? '✓ Set' : '✗ Missing',
          integration_key: docusignIntegrationKey ? '✓ Set' : '✗ Missing',
          secret_key: docusignSecretKey ? '✓ Set' : '✗ Missing'
        },
        description: 'Electronic signature platform for quotes, contracts, and work authorizations'
      });
    } catch (error) {
      results.push({
        name: 'DocuSign',
        status: 'error',
        error: error.message,
        description: 'Electronic signature platform'
      });
    }

    // 2. Stripe
    try {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      const stripePublishable = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
      const stripeWebhook = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      
      if (stripeKey) {
        const stripe = new Stripe(stripeKey);
        const account = await stripe.accounts.retrieve();
        
        results.push({
          name: 'Stripe',
          status: 'active',
          details: {
            mode: stripeKey.includes('test') ? 'Test Mode' : 'Live Mode',
            account: account.business_profile?.name || account.email,
            publishable_key: stripePublishable ? '✓ Set' : '✗ Missing',
            webhook_secret: stripeWebhook ? '✓ Set' : '✗ Missing'
          },
          description: 'Payment processing for invoices and subscriptions'
        });
      } else {
        results.push({
          name: 'Stripe',
          status: 'missing_keys',
          details: { secret_key: '✗ Missing' },
          description: 'Payment processing platform'
        });
      }
    } catch (error) {
      results.push({
        name: 'Stripe',
        status: 'error',
        error: error.message,
        description: 'Payment processing platform'
      });
    }

    // 3. SendGrid
    try {
      const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
      const sendgridFrom = Deno.env.get('SENDGRID_FROM_EMAIL');
      
      if (sendgridKey) {
        // Test API key validity
        const response = await fetch('https://api.sendgrid.com/v3/user/account', {
          headers: {
            'Authorization': `Bearer ${sendgridKey}`
          }
        });
        
        results.push({
          name: 'SendGrid',
          status: response.ok ? 'active' : 'invalid_key',
          details: {
            api_key: '✓ Set',
            from_email: sendgridFrom || '✗ Missing',
            account_status: response.ok ? 'Valid' : 'Invalid'
          },
          description: 'Transactional email delivery for notifications and invitations'
        });
      } else {
        results.push({
          name: 'SendGrid',
          status: 'missing_keys',
          details: { api_key: '✗ Missing' },
          description: 'Email delivery platform'
        });
      }
    } catch (error) {
      results.push({
        name: 'SendGrid',
        status: 'error',
        error: error.message,
        description: 'Email delivery platform'
      });
    }

    // 4. Google Maps
    try {
      const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      
      if (mapsKey) {
        // Test geocoding API
        const testResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=Atlanta,GA&key=${mapsKey}`
        );
        const testData = await testResponse.json();
        
        results.push({
          name: 'Google Maps',
          status: testData.status === 'OK' ? 'active' : 'error',
          details: {
            api_key: '✓ Set',
            geocoding: testData.status === 'OK' ? '✓ Working' : '✗ Failed',
            status: testData.status
          },
          description: 'Geocoding, mapping, and GPS tracking for jobs and time entries'
        });
      } else {
        results.push({
          name: 'Google Maps',
          status: 'missing_keys',
          details: { api_key: '✗ Missing' },
          description: 'Geocoding and mapping platform'
        });
      }
    } catch (error) {
      results.push({
        name: 'Google Maps',
        status: 'error',
        error: error.message,
        description: 'Geocoding and mapping platform'
      });
    }

    // 5. Google Drive (OAuth)
    try {
      const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
      
      if (driveToken) {
        // Test Drive API
        const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { 'Authorization': `Bearer ${driveToken}` }
        });
        
        const driveData = await driveResponse.json();
        
        results.push({
          name: 'Google Drive',
          status: driveResponse.ok ? 'active' : 'error',
          details: {
            oauth: '✓ Connected',
            account: driveData.user?.emailAddress || 'Unknown',
            scopes: 'drive.file'
          },
          description: 'Document storage for job folders, blueprints, and photos'
        });
      } else {
        results.push({
          name: 'Google Drive',
          status: 'not_connected',
          details: { oauth: '✗ Not authorized' },
          description: 'Document storage platform'
        });
      }
    } catch (error) {
      results.push({
        name: 'Google Drive',
        status: 'error',
        error: error.message,
        description: 'Document storage platform'
      });
    }

    // 6. MCI Connect (Cross-app)
    try {
      const mciUrl = Deno.env.get('MCI_CONNECT_URL');
      const mciToken = Deno.env.get('MCI_CONNECT_TOKEN');
      
      results.push({
        name: 'MCI Connect API',
        status: (mciUrl && mciToken) ? 'configured' : 'missing_keys',
        details: {
          url: mciUrl ? '✓ Set' : '✗ Missing',
          token: mciToken ? '✓ Set' : '✗ Missing'
        },
        description: 'Cross-app integration for syncing employees and catalog items'
      });
    } catch (error) {
      results.push({
        name: 'MCI Connect API',
        status: 'error',
        error: error.message,
        description: 'Cross-app integration'
      });
    }

    return Response.json({ 
      integrations: results,
      checked_at: new Date().toISOString(),
      total: results.length,
      active: results.filter(r => r.status === 'active').length,
      errors: results.filter(r => r.status === 'error').length
    });

  } catch (error) {
    console.error('Integration health check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});