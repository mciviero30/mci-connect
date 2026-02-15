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
      const docusignUserId = Deno.env.get('DOCUSIGN_USER_ID');
      
      if (docusignAccountId && docusignIntegrationKey && docusignSecretKey) {
        // Test DocuSign API connection
        const authResponse = await fetch('https://account-d.docusign.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: 'test' // Simplified test - just checking if endpoint responds
          })
        });
        
        // Even if auth fails, if we get a response it means API is reachable
        const apiReachable = authResponse.status === 400 || authResponse.status === 401; // Expected for test
        
        results.push({
          name: 'DocuSign',
          status: apiReachable ? 'active' : 'error',
          details: {
            account_id: docusignAccountId ? '✓ Set' : '✗ Missing',
            integration_key: docusignIntegrationKey ? '✓ Set' : '✗ Missing',
            secret_key: docusignSecretKey ? '✓ Set' : '✗ Missing',
            user_id: docusignUserId ? '✓ Set' : '✗ Missing',
            api_status: apiReachable ? 'Reachable' : 'Unreachable'
          },
          description: 'Electronic signature platform for quotes, contracts, and work authorizations'
        });
      } else {
        results.push({
          name: 'DocuSign',
          status: 'missing_keys',
          details: {
            account_id: docusignAccountId ? '✓ Set' : '✗ Missing',
            integration_key: docusignIntegrationKey ? '✓ Set' : '✗ Missing',
            secret_key: docusignSecretKey ? '✓ Set' : '✗ Missing',
            user_id: docusignUserId ? '✓ Set' : '✗ Missing'
          },
          description: 'Electronic signature platform for quotes, contracts, and work authorizations'
        });
      }
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
        // Test API key validity using /scopes endpoint (more reliable)
        const response = await fetch('https://api.sendgrid.com/v3/scopes', {
          headers: {
            'Authorization': `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        const isValid = response.status === 200;
        let errorDetail = '';
        
        if (!isValid) {
          const errorData = await response.json().catch(() => ({}));
          errorDetail = errorData.errors?.[0]?.message || `HTTP ${response.status}`;
        }
        
        results.push({
          name: 'SendGrid',
          status: isValid ? 'active' : 'invalid_key',
          details: {
            api_key: isValid ? '✓ Valid' : '✗ Invalid',
            from_email: sendgridFrom || '✗ Missing',
            account_status: isValid ? 'Valid' : errorDetail
          },
          description: 'Transactional email delivery for notifications and invitations',
          error: !isValid ? errorDetail : undefined
        });
      } else {
        results.push({
          name: 'SendGrid',
          status: 'missing_keys',
          details: { api_key: '✗ Missing', from_email: sendgridFrom || '✗ Missing' },
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
      let driveToken;
      let tokenError = null;
      
      try {
        driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
      } catch (err) {
        tokenError = err.message;
      }
      
      if (driveToken) {
        try {
          // Test Drive API
          const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: { 'Authorization': `Bearer ${driveToken}` }
          });
          
          if (driveResponse.ok) {
            const driveData = await driveResponse.json();
            results.push({
              name: 'Google Drive',
              status: 'active',
              details: {
                oauth: '✓ Connected',
                account: driveData.user?.emailAddress || 'Unknown',
                scopes: 'drive.file (Limited)',
                limitation: '⚠️ Can only access files created by app - cannot create folders'
              },
              description: 'Document storage - LIMITED ACCESS (drive.file scope)',
              warning: 'Current scope only allows access to app-created files. Cannot create job folders automatically.'
            });
          } else {
            const errorData = await driveResponse.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || '';
            
            results.push({
              name: 'Google Drive',
              status: 'error',
              details: {
                oauth: '✓ Token exists',
                scopes: 'drive.file (Limited)',
                error: errorMsg.includes('insufficient') ? 
                  'Insufficient scopes - need full drive access' : 
                  (errorMsg || `HTTP ${driveResponse.status}`)
              },
              error: errorMsg || 'API authentication failed',
              description: 'Document storage platform',
              warning: errorMsg.includes('insufficient') ? 
                'Re-authorize with full Drive permissions to create job folders' : undefined
            });
          }
        } catch (apiError) {
          results.push({
            name: 'Google Drive',
            status: 'error',
            details: {
              oauth: '✓ Token exists',
              error: 'API call failed'
            },
            error: apiError.message,
            description: 'Document storage platform'
          });
        }
      } else {
        results.push({
          name: 'Google Drive',
          status: tokenError ? 'error' : 'not_connected',
          details: { 
            oauth: '✗ Not authorized',
            note: tokenError || 'OAuth connection required'
          },
          error: tokenError,
          description: 'Document storage platform - requires OAuth authorization'
        });
      }
    } catch (error) {
      results.push({
        name: 'Google Drive',
        status: 'error',
        error: error.message,
        details: { oauth: '✗ Check failed' },
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