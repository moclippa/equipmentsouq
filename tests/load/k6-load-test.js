/**
 * EquipmentSouq Load Test Suite
 *
 * This k6 script tests critical user journeys under various load conditions.
 *
 * Test Scenarios:
 * 1. Homepage load (anonymous users)
 * 2. Equipment search with filters
 * 3. Equipment detail page
 * 4. Category listing
 * 5. Lead creation (authenticated users)
 * 6. User authentication flow (OTP)
 *
 * Usage:
 *   npm run test:load              # Normal load (100 VUs)
 *   npm run test:load:spike        # Spike test (500 VUs)
 *   npm run test:load:stress       # Stress test (1000 VUs)
 *   npm run test:load:soak         # Soak test (50 VUs for 30 min)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Load test scenarios (can override with environment variables)
const SCENARIO = __ENV.SCENARIO || 'normal'; // normal, spike, stress, soak

// ============================================================================
// CUSTOM METRICS
// ============================================================================

const homepageLoadTime = new Trend('homepage_load_time');
const searchResponseTime = new Trend('search_response_time');
const equipmentDetailTime = new Trend('equipment_detail_time');
const leadCreationTime = new Trend('lead_creation_time');
const authFlowTime = new Trend('auth_flow_time');

const searchErrors = new Rate('search_errors');
const authErrors = new Rate('auth_errors');
const leadErrors = new Rate('lead_errors');

const totalRequests = new Counter('total_requests');
const failedRequests = new Counter('failed_requests');

// ============================================================================
// TEST OPTIONS
// ============================================================================

export const options = {
  scenarios: {
    // Normal load: Ramp up to 100 users over 2 min, sustain for 5 min, ramp down
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },   // Warm up
        { duration: '3m', target: 100 },  // Ramp up to normal load
        { duration: '5m', target: 100 },  // Sustained load
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'normalUserJourney',
    },

    // Spike test: Sudden spike to 500 users (if SCENARIO=spike)
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },  // Normal load
        { duration: '30s', target: 500 }, // Sudden spike
        { duration: '2m', target: 500 },  // Sustain spike
        { duration: '1m', target: 100 },  // Recovery
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'normalUserJourney',
      env: { SCENARIO: 'spike' },
    },

    // Authenticated user journeys (20% of traffic)
    authenticated_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '3m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'authenticatedUserJourney',
    },
  },

  // Performance thresholds (from performance-budgets.json)
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    'http_req_duration{page:homepage}': ['p(95)<2500'], // Homepage LCP < 2.5s
    'http_req_duration{endpoint:search}': ['p(95)<1000'], // Search < 1s
    'http_req_duration{endpoint:equipment}': ['p(95)<500'], // API < 500ms
    'http_req_failed': ['rate<0.05'], // Error rate < 5%
    'search_errors': ['rate<0.02'], // Search errors < 2%
    'auth_errors': ['rate<0.01'], // Auth errors < 1%
  },

  // Global settings
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// ============================================================================
// TEST DATA
// ============================================================================

const SAMPLE_CATEGORIES = [
  'excavators',
  'bulldozers',
  'cranes',
  'loaders',
  'dump-trucks',
  'graders',
  'compactors',
  'forklifts',
];

const SAMPLE_LOCATIONS = [
  'riyadh',
  'jeddah',
  'dammam',
  'manama',
  'khobar',
  'makkah',
];

const LISTING_TYPES = ['FOR_RENT', 'FOR_SALE', 'BOTH'];

// Phone numbers for OTP testing (use test numbers in production)
const TEST_PHONES = [
  '+966501234567',
  '+966507654321',
  '+973331234567',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateHeaders(authenticated = false, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Language': randomItem(['en', 'ar']),
  };

  if (authenticated && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function makeRequest(method, url, body = null, tags = {}) {
  totalRequests.add(1);

  const params = {
    headers: generateHeaders(),
    tags: tags,
  };

  let response;
  if (method === 'GET') {
    response = http.get(url, params);
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(body), params);
  } else if (method === 'PATCH') {
    response = http.patch(url, JSON.stringify(body), params);
  }

  if (response.status >= 400) {
    failedRequests.add(1);
  }

  return response;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Normal user journey (anonymous browsing)
 * Simulates typical user flow: homepage → search → equipment detail
 */
export function normalUserJourney() {
  // 1. Homepage load
  group('Homepage Load', () => {
    const response = makeRequest('GET', BASE_URL, null, { page: 'homepage' });

    homepageLoadTime.add(response.timings.duration);

    check(response, {
      'Homepage status is 200': (r) => r.status === 200,
      'Homepage loads in < 2.5s': (r) => r.timings.duration < 2500,
      'Homepage has content': (r) => r.body.includes('EquipmentSouq') || r.body.includes('معدات'),
    });
  });

  sleep(randomIntBetween(1, 3)); // User reads homepage

  // 2. Category browsing
  group('Category Listing', () => {
    const response = makeRequest('GET', `${API_URL}/categories`, null, { endpoint: 'categories' });

    check(response, {
      'Categories status is 200': (r) => r.status === 200,
      'Categories response time < 500ms': (r) => r.timings.duration < 500,
      'Categories has data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) && data.length > 0;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(randomIntBetween(2, 4));

  // 3. Equipment search with filters
  group('Equipment Search', () => {
    const category = randomItem(SAMPLE_CATEGORIES);
    const location = randomItem(SAMPLE_LOCATIONS);
    const listingType = randomItem(LISTING_TYPES);

    const searchUrl = `${API_URL}/equipment?category=${category}&location=${location}&listingType=${listingType}&page=1&limit=20`;
    const response = makeRequest('GET', searchUrl, null, { endpoint: 'search' });

    searchResponseTime.add(response.timings.duration);

    const success = check(response, {
      'Search status is 200': (r) => r.status === 200,
      'Search response time < 1s': (r) => r.timings.duration < 1000,
      'Search returns results': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.equipment && Array.isArray(data.equipment);
        } catch {
          return false;
        }
      },
    });

    searchErrors.add(!success);

    // Extract first equipment ID for detail view
    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        if (data.equipment && data.equipment.length > 0) {
          const equipmentId = data.equipment[0].id;

          sleep(randomIntBetween(3, 6)); // User reviews search results

          // 4. Equipment detail view
          group('Equipment Detail', () => {
            const detailResponse = makeRequest('GET', `${API_URL}/equipment/${equipmentId}`, null, { endpoint: 'equipment' });

            equipmentDetailTime.add(detailResponse.timings.duration);

            check(detailResponse, {
              'Equipment detail status is 200': (r) => r.status === 200,
              'Equipment detail response time < 500ms': (r) => r.timings.duration < 500,
              'Equipment has required fields': (r) => {
                try {
                  const equipment = JSON.parse(r.body);
                  return equipment.title && equipment.category && equipment.owner;
                } catch {
                  return false;
                }
              },
            });
          });
        }
      } catch (e) {
        console.error('Failed to parse search results:', e);
      }
    }
  });

  sleep(randomIntBetween(2, 5)); // User thinks before next action
}

/**
 * Authenticated user journey
 * Simulates logged-in user creating a lead (contact request)
 */
export function authenticatedUserJourney() {
  let authToken = null;

  // 1. Authentication flow (OTP)
  group('User Authentication', () => {
    const phone = randomItem(TEST_PHONES);

    // Send OTP
    const sendOtpResponse = makeRequest('POST', `${API_URL}/auth/otp/send`, {
      phone: phone,
    }, { endpoint: 'auth' });

    const otpSent = check(sendOtpResponse, {
      'OTP send status is 200': (r) => r.status === 200 || r.status === 201,
      'OTP send response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (!otpSent) {
      authErrors.add(1);
      return; // Skip rest of flow if OTP fails
    }

    sleep(1); // Simulate user receiving SMS

    // Verify OTP (use mock OTP in dev: 123456)
    const verifyOtpResponse = makeRequest('POST', `${API_URL}/auth/otp/verify`, {
      phone: phone,
      code: '123456', // Mock OTP for testing
    }, { endpoint: 'auth' });

    authFlowTime.add(sendOtpResponse.timings.duration + verifyOtpResponse.timings.duration);

    const verified = check(verifyOtpResponse, {
      'OTP verify status is 200': (r) => r.status === 200,
      'OTP verify has token': (r) => {
        try {
          const data = JSON.parse(r.body);
          return !!data.token || !!data.session;
        } catch {
          return false;
        }
      },
    });

    if (verified) {
      try {
        const data = JSON.parse(verifyOtpResponse.body);
        authToken = data.token || data.session?.token;
      } catch (e) {
        console.error('Failed to extract auth token:', e);
      }
    } else {
      authErrors.add(1);
    }
  });

  if (!authToken) {
    return; // Skip lead creation if auth failed
  }

  sleep(randomIntBetween(2, 4));

  // 2. Browse equipment (reuse normal journey)
  normalUserJourney();

  sleep(randomIntBetween(3, 6));

  // 3. Create lead (contact request)
  group('Lead Creation', () => {
    // First, search for equipment to get valid ID
    const searchResponse = makeRequest('GET', `${API_URL}/equipment?page=1&limit=1`, null, { endpoint: 'search' });

    if (searchResponse.status === 200) {
      try {
        const data = JSON.parse(searchResponse.body);
        if (data.equipment && data.equipment.length > 0) {
          const equipmentId = data.equipment[0].id;

          const leadData = {
            equipmentId: equipmentId,
            message: 'I am interested in this equipment. Please contact me.',
            requestedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            requestedEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
          };

          const leadResponse = makeRequest('POST', `${API_URL}/leads`, leadData, { endpoint: 'leads' });

          leadCreationTime.add(leadResponse.timings.duration);

          const success = check(leadResponse, {
            'Lead creation status is 200/201': (r) => r.status === 200 || r.status === 201,
            'Lead creation response time < 1s': (r) => r.timings.duration < 1000,
            'Lead has ID': (r) => {
              try {
                const lead = JSON.parse(r.body);
                return !!lead.id;
              } catch {
                return false;
              }
            },
          });

          leadErrors.add(!success);
        }
      } catch (e) {
        console.error('Failed to create lead:', e);
        leadErrors.add(1);
      }
    }
  });

  sleep(randomIntBetween(2, 5));
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

export function setup() {
  console.log('========================================');
  console.log('EquipmentSouq Load Test Starting');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Scenario: ${SCENARIO}`);
  console.log('========================================');

  // Warm up: Check if server is reachable
  const healthCheck = http.get(BASE_URL);
  if (healthCheck.status !== 200) {
    console.error('WARNING: Server health check failed!');
    console.error(`Status: ${healthCheck.status}`);
    console.error('Tests may fail. Ensure the server is running.');
  } else {
    console.log('Server health check passed ✓');
  }

  return { startTime: new Date() };
}

export function teardown(data) {
  console.log('========================================');
  console.log('EquipmentSouq Load Test Complete');
  console.log('========================================');
  console.log(`Duration: ${Math.round((new Date() - data.startTime) / 1000)}s`);
  console.log('Check metrics below for detailed results.');
  console.log('========================================');
}

// ============================================================================
// DEFAULT EXPORT (for k6 cloud)
// ============================================================================

export default normalUserJourney;
