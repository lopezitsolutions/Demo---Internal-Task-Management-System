/**
 * Demo Mode Interceptor - SELF-CONTAINED VERSION v3
 * Handles fetch interception AND demo data initialization.
 * No external dependencies.
 */

(function () {
  "use strict";

  const DEMO_MODE_KEY = "itwmsDemoMode";
  const DEMO_USER_KEY = "demoUser";
  const DEMO_ROLE_KEY = "demoRole";

  // ─── EMBEDDED DEMO DATA ───
  const EMBEDDED_DEMO_DATA = {
    users: [
      { id: 1, email: "admin@itwms.demo", nickname: "Admin User", phoneNum: "+1-555-0101", depId: 1, department: { id: 1, name: "Operations" }, role: { id: 1, name: "Admin" }, roleName: "Admin", depName: "Operations", createdAt: "2024-01-15T08:00:00Z", updatedAt: "2024-06-20T14:30:00Z", deletedAt: null },
      { id: 2, email: "manager@itwms.demo", nickname: "Manager User", phoneNum: "+1-555-0102", depId: 1, department: { id: 1, name: "Operations" }, role: { id: 2, name: "Manager" }, roleName: "Manager", depName: "Operations", createdAt: "2024-02-01T09:00:00Z", updatedAt: "2024-06-18T11:20:00Z", deletedAt: null },
      { id: 3, email: "lead@itwms.demo", nickname: "Team Lead User", phoneNum: "+1-555-0103", depId: 2, department: { id: 2, name: "Engineering" }, role: { id: 2, name: "Manager" }, roleName: "Manager", depName: "Engineering", createdAt: "2024-02-10T10:00:00Z", updatedAt: "2024-06-15T16:45:00Z", deletedAt: null },
      { id: 4, email: "employee1@itwms.demo", nickname: "Developer User 1", phoneNum: "+1-555-0104", depId: 2, department: { id: 2, name: "Engineering" }, role: { id: 3, name: "Employee" }, roleName: "Employee", depName: "Engineering", createdAt: "2024-03-01T08:30:00Z", updatedAt: "2024-06-22T09:15:00Z", deletedAt: null },
      { id: 5, email: "employee2@itwms.demo", nickname: "Developer User 2", phoneNum: "+1-555-0105", depId: 2, department: { id: 2, name: "Engineering" }, role: { id: 3, name: "Employee" }, roleName: "Employee", depName: "Engineering", createdAt: "2024-03-15T11:00:00Z", updatedAt: "2024-06-21T13:40:00Z", deletedAt: null },
      { id: 6, email: "employee3@itwms.demo", nickname: "QA User 1", phoneNum: "+1-555-0106", depId: 3, department: { id: 3, name: "Quality Assurance" }, role: { id: 3, name: "Employee" }, roleName: "Employee", depName: "Quality Assurance", createdAt: "2024-04-01T09:00:00Z", updatedAt: "2024-06-19T10:30:00Z", deletedAt: null },
      { id: 7, email: "employee4@itwms.demo", nickname: "QA User 2", phoneNum: "+1-555-0107", depId: 3, department: { id: 3, name: "Quality Assurance" }, role: { id: 3, name: "Employee" }, roleName: "Employee", depName: "Quality Assurance", createdAt: "2024-04-10T08:00:00Z", updatedAt: "2024-06-20T15:20:00Z", deletedAt: null },
      { id: 8, email: "employee5@itwms.demo", nickname: "HR User", phoneNum: "+1-555-0108", depId: 4, department: { id: 4, name: "Human Resources" }, role: { id: 3, name: "Employee" }, roleName: "Employee", depName: "Human Resources", createdAt: "2024-05-01T10:00:00Z", updatedAt: "2024-06-18T12:00:00Z", deletedAt: null }
    ],
    departments: [
      { id: 1, depName: "Operations", name: "Operations", description: "Central operations and project coordination", managerId: 2, createdAt: "2024-01-10T08:00:00Z", updatedAt: "2024-06-15T14:00:00Z", deletedAt: null },
      { id: 2, depName: "Engineering", name: "Engineering", description: "Software development and technical architecture", managerId: 3, createdAt: "2024-01-12T09:00:00Z", updatedAt: "2024-06-16T10:30:00Z", deletedAt: null },
      { id: 3, depName: "Quality Assurance", name: "Quality Assurance", description: "Testing, quality control and compliance", managerId: null, createdAt: "2024-02-01T10:00:00Z", updatedAt: "2024-06-17T11:00:00Z", deletedAt: null },
      { id: 4, depName: "Human Resources", name: "Human Resources", description: "Recruitment, training and employee relations", managerId: null, createdAt: "2024-03-01T08:00:00Z", updatedAt: "2024-06-18T09:00:00Z", deletedAt: null }
    ],
    notes: [
      { id: 1, noteName: "Q3 Roadmap Planning", description: "Plan the product roadmap for Q3 2024 including new features and improvements.", depId: 2, department: { id: 2, depName: "Engineering", name: "Engineering" }, departmentId: 2, dueDate: "2024-07-15T00:00:00Z", status: "Active", createdAt: "2024-06-01T10:00:00Z", updatedAt: "2024-06-20T16:00:00Z", deletedAt: null, tasks: [] },
      { id: 2, noteName: "Security Audit Findings", description: "Document findings from the annual security audit and remediation steps.", depId: 3, department: { id: 3, depName: "Quality Assurance", name: "Quality Assurance" }, departmentId: 3, dueDate: "2024-07-30T00:00:00Z", status: "Active", createdAt: "2024-06-05T09:00:00Z", updatedAt: "2024-06-19T14:00:00Z", deletedAt: null, tasks: [] },
      { id: 3, noteName: "Team Offsite 2024", description: "Organize the annual team offsite event including venue, agenda and logistics.", depId: 4, department: { id: 4, depName: "Human Resources", name: "Human Resources" }, departmentId: 4, dueDate: "2024-08-15T00:00:00Z", status: "Active", createdAt: "2024-06-10T11:00:00Z", updatedAt: "2024-06-21T10:00:00Z", deletedAt: null, tasks: [] },
      { id: 4, noteName: "Legacy System Migration", description: "Migrate legacy systems to the new cloud infrastructure.", depId: 2, department: { id: 2, depName: "Engineering", name: "Engineering" }, departmentId: 2, dueDate: "2024-09-01T00:00:00Z", status: "Archived", createdAt: "2024-05-01T08:00:00Z", updatedAt: "2024-06-01T12:00:00Z", deletedAt: null, tasks: [] },
      { id: 5, noteName: "Customer Feedback Analysis", description: "Analyze Q2 customer feedback and identify improvement areas.", depId: 1, department: { id: 1, depName: "Operations", name: "Operations" }, departmentId: 1, dueDate: "2024-07-20T00:00:00Z", status: "Active", createdAt: "2024-06-15T13:00:00Z", updatedAt: "2024-06-22T09:00:00Z", deletedAt: null, tasks: [] }
    ],
    tasks: [
      { id: 1, taskName: "Design API v2 Specification", description: "Create OpenAPI specification for the new REST API version 2.", noteId: 1, note: { id: 1, noteName: "Q3 Roadmap Planning" }, assignedTo: 4, assignedToUser: { id: 4, nickname: "Developer User 1", email: "employee1@itwms.demo" }, createdBy: 3, createdByUser: { id: 3, nickname: "Team Lead User", email: "lead@itwms.demo" }, dueDate: "2024-07-10T00:00:00Z", taskStatus: "in_progress", status: "in_progress", createdAt: "2024-06-10T09:00:00Z", updatedAt: "2024-06-21T14:00:00Z", deletedAt: null, collaborators: [{ id: 5, userId: 5, nickname: "Developer User 2", email: "employee2@itwms.demo" }] },
      { id: 2, taskName: "Implement Authentication Middleware", description: "Build JWT-based authentication middleware for all API endpoints.", noteId: 1, note: { id: 1, noteName: "Q3 Roadmap Planning" }, assignedTo: 5, assignedToUser: { id: 5, nickname: "Developer User 2", email: "employee2@itwms.demo" }, createdBy: 3, createdByUser: { id: 3, nickname: "Team Lead User", email: "lead@itwms.demo" }, dueDate: "2024-07-20T00:00:00Z", taskStatus: "to_do", status: "to_do", createdAt: "2024-06-11T10:00:00Z", updatedAt: "2024-06-20T11:00:00Z", deletedAt: null, collaborators: [] },
      { id: 3, taskName: "Write Penetration Test Report", description: "Document results from external penetration testing engagement.", noteId: 2, note: { id: 2, noteName: "Security Audit Findings" }, assignedTo: 6, assignedToUser: { id: 6, nickname: "QA User 1", email: "employee3@itwms.demo" }, createdBy: 2, createdByUser: { id: 2, nickname: "Manager User", email: "manager@itwms.demo" }, dueDate: "2024-07-25T00:00:00Z", taskStatus: "pending_approval", status: "pending_approval", createdAt: "2024-06-12T08:00:00Z", updatedAt: "2024-06-21T09:00:00Z", deletedAt: null, collaborators: [{ id: 7, userId: 7, nickname: "QA User 2", email: "employee4@itwms.demo" }] },
      { id: 4, taskName: "Fix SQL Injection Vulnerability", description: "Patch the reported SQL injection in the user search endpoint.", noteId: 2, note: { id: 2, noteName: "Security Audit Findings" }, assignedTo: 4, assignedToUser: { id: 4, nickname: "Developer User 1", email: "employee1@itwms.demo" }, createdBy: 3, createdByUser: { id: 3, nickname: "Team Lead User", email: "lead@itwms.demo" }, dueDate: "2024-07-05T00:00:00Z", taskStatus: "completed", status: "completed", rating: 5, ratingComment: "Fast turnaround and thorough testing before merge. Great work.", ratedByUser: { id: 3, nickname: "Team Lead User", roleName: "Manager" }, createdAt: "2024-06-08T07:00:00Z", updatedAt: "2024-06-18T16:00:00Z", deletedAt: null, collaborators: [] },
      { id: 5, taskName: "Book Venue for Offsite", description: "Research and book a suitable venue for the 2024 team offsite.", noteId: 3, note: { id: 3, noteName: "Team Offsite 2024" }, assignedTo: 8, assignedToUser: { id: 8, nickname: "HR User", email: "employee5@itwms.demo" }, createdBy: 2, createdByUser: { id: 2, nickname: "Manager User", email: "manager@itwms.demo" }, dueDate: "2024-07-15T00:00:00Z", taskStatus: "to_do", status: "to_do", createdAt: "2024-06-15T11:00:00Z", updatedAt: "2024-06-21T10:00:00Z", deletedAt: null, collaborators: [] },
      { id: 6, taskName: "Prepare Offsite Agenda", description: "Draft the agenda and schedule for the team offsite day.", noteId: 3, note: { id: 3, noteName: "Team Offsite 2024" }, assignedTo: 8, assignedToUser: { id: 8, nickname: "HR User", email: "employee5@itwms.demo" }, createdBy: 1, createdByUser: { id: 1, nickname: "Admin User", email: "admin@itwms.demo" }, dueDate: "2024-07-20T00:00:00Z", taskStatus: "in_progress", status: "in_progress", createdAt: "2024-06-16T09:00:00Z", updatedAt: "2024-06-22T08:00:00Z", deletedAt: null, collaborators: [{ id: 2, userId: 2, nickname: "Manager User", email: "manager@itwms.demo" }] },
      { id: 7, taskName: "Migrate Database Schema", description: "Execute the database schema migration scripts for the cloud migration.", noteId: 4, note: { id: 4, noteName: "Legacy System Migration" }, assignedTo: 5, assignedToUser: { id: 5, nickname: "Developer User 2", email: "employee2@itwms.demo" }, createdBy: 3, createdByUser: { id: 3, nickname: "Team Lead User", email: "lead@itwms.demo" }, dueDate: "2024-08-01T00:00:00Z", taskStatus: "rejected", status: "rejected", createdAt: "2024-05-15T10:00:00Z", updatedAt: "2024-06-10T14:00:00Z", deletedAt: null, collaborators: [] },
      { id: 8, taskName: "Compile Feedback Summary", description: "Create a summary report of all customer feedback from Q2.", noteId: 5, note: { id: 5, noteName: "Customer Feedback Analysis" }, assignedTo: 2, assignedToUser: { id: 2, nickname: "Manager User", email: "manager@itwms.demo" }, createdBy: 1, createdByUser: { id: 1, nickname: "Admin User", email: "admin@itwms.demo" }, dueDate: "2024-07-18T00:00:00Z", taskStatus: "to_do", status: "to_do", createdAt: "2024-06-18T13:00:00Z", updatedAt: "2024-06-22T09:30:00Z", deletedAt: null, collaborators: [{ id: 8, userId: 8, nickname: "HR User", email: "employee5@itwms.demo" }] },
      { id: 9, taskName: "Update Documentation", description: "Update the API documentation with the latest endpoint changes.", noteId: 1, note: { id: 1, noteName: "Q3 Roadmap Planning" }, assignedTo: 4, assignedToUser: { id: 4, nickname: "Developer User 1", email: "employee1@itwms.demo" }, createdBy: 3, createdByUser: { id: 3, nickname: "Team Lead User", email: "lead@itwms.demo" }, dueDate: "2024-07-12T00:00:00Z", taskStatus: "cancelled", status: "cancelled", createdAt: "2024-06-14T08:00:00Z", updatedAt: "2024-06-19T11:00:00Z", deletedAt: null, collaborators: [] },
      { id: 10, taskName: "Performance Testing", description: "Run load tests on the new staging environment.", noteId: 2, note: { id: 2, noteName: "Security Audit Findings" }, assignedTo: 7, assignedToUser: { id: 7, nickname: "QA User 2", email: "employee4@itwms.demo" }, createdBy: 6, createdByUser: { id: 6, nickname: "QA User 1", email: "employee3@itwms.demo" }, dueDate: "2024-07-28T00:00:00Z", taskStatus: "completed", status: "completed", rating: 4, ratingComment: "Solid load test coverage. Would like to see edge-case scenarios next time.", ratedByUser: { id: 1, nickname: "Admin User", roleName: "Admin" }, createdAt: "2024-06-20T10:00:00Z", updatedAt: "2024-06-22T11:00:00Z", deletedAt: null, collaborators: [] }
    ],
    auditTrails: [
      { id: 1, action: "CREATE", tableName: "tasks", recordId: "1", userId: 3, userEmail: "lead@itwms.demo", oldData: null, newData: JSON.stringify({ taskName: "Design API v2 Specification", status: "to_do" }), createdAt: "2024-06-10T09:00:00Z" },
      { id: 2, action: "UPDATE", tableName: "tasks", recordId: "1", userId: 4, userEmail: "employee1@itwms.demo", oldData: JSON.stringify({ status: "to_do" }), newData: JSON.stringify({ status: "in_progress" }), createdAt: "2024-06-15T14:00:00Z" },
      { id: 3, action: "CREATE", tableName: "notes", recordId: "5", userId: 1, userEmail: "admin@itwms.demo", oldData: null, newData: JSON.stringify({ noteName: "Customer Feedback Analysis", status: "Active" }), createdAt: "2024-06-15T13:00:00Z" },
      { id: 4, action: "DELETE", tableName: "users", recordId: "9", userId: 1, userEmail: "admin@itwms.demo", oldData: JSON.stringify({ nickname: "Temp User", email: "temp@itwms.demo" }), newData: null, createdAt: "2024-06-18T10:00:00Z" },
      { id: 5, action: "UPDATE", tableName: "tasks", recordId: "3", userId: 6, userEmail: "employee3@itwms.demo", oldData: JSON.stringify({ status: "in_progress" }), newData: JSON.stringify({ status: "pending_approval" }), createdAt: "2024-06-21T09:00:00Z" }
    ],
    stats: {
      overview: { tasks: { total: 10 }, notes: { total: 5 } }
    },
    reports: [
      { id: 1, userId: 4, depId: 2, title: "Weekly Engineering Status Update", content: "<p>Completed the API v2 specification draft and started work on the authentication middleware. No blockers this week.</p>", reportType: "weekly", status: "submitted", createdAt: "2024-06-14T09:00:00Z", updatedAt: "2024-06-14T09:00:00Z", deletedAt: null },
      { id: 2, userId: 5, depId: 2, title: "Sprint Accomplishments - Sprint 14", content: "<p>Delivered the JWT authentication middleware and closed out 6 tickets. Paired with QA on the regression suite.</p>", reportType: "accomplishment", status: "reviewed", createdAt: "2024-06-10T10:30:00Z", updatedAt: "2024-06-16T11:00:00Z", deletedAt: null },
      { id: 3, userId: 6, depId: 3, title: "QA Regression Testing Summary", content: "<p>Ran the full regression suite against staging. 3 minor defects logged, none blocking release.</p>", reportType: "weekly", status: "submitted", createdAt: "2024-06-17T08:15:00Z", updatedAt: "2024-06-17T08:15:00Z", deletedAt: null },
      { id: 4, userId: 7, depId: 3, title: "Production Incident Concern - API Latency", content: "<p>Noticed elevated response times on the search endpoint during peak hours. Recommend investigating before next release.</p>", reportType: "concern", status: "reviewed", createdAt: "2024-06-12T13:45:00Z", updatedAt: "2024-06-15T09:20:00Z", deletedAt: null },
      { id: 5, userId: 8, depId: 4, title: "Onboarding Process Notes (Draft)", content: "<p>Draft outline for the updated new-hire onboarding checklist. Still needs the IT provisioning section.</p>", reportType: "general", status: "draft", createdAt: "2024-06-19T14:00:00Z", updatedAt: "2024-06-19T14:00:00Z", deletedAt: null },
      { id: 6, userId: 2, depId: 1, title: "Monthly Operations Summary - May", content: "<p>All operational KPIs on target for May. Vendor onboarding for the new logistics partner completed ahead of schedule.</p>", reportType: "monthly", status: "archived", createdAt: "2024-06-01T08:00:00Z", updatedAt: "2024-06-05T10:00:00Z", deletedAt: null },
      { id: 7, userId: 4, depId: 2, title: "Daily Standup Notes - June 20", content: "<p>Continuing work on the authentication middleware. Planning to start integration tests tomorrow.</p>", reportType: "daily", status: "draft", createdAt: "2024-06-20T08:05:00Z", updatedAt: "2024-06-20T08:05:00Z", deletedAt: null },
      { id: 8, userId: 8, depId: 4, title: "Team Offsite Planning Update", content: "<p>Venue shortlisted and agenda draft shared with leadership for feedback. Booking confirmation expected next week.</p>", reportType: "operational", status: "submitted", createdAt: "2024-06-18T11:30:00Z", updatedAt: "2024-06-18T11:30:00Z", deletedAt: null },
      { id: 9, userId: 3, depId: 2, title: "Security Audit Remediation Progress", content: "<p>2 of 3 findings from the security audit have been remediated. SQL injection patch is live; penetration re-test scheduled.</p>", reportType: "weekly", status: "reviewed", createdAt: "2024-06-16T09:00:00Z", updatedAt: "2024-06-20T14:00:00Z", deletedAt: null },
      { id: 10, userId: 1, depId: 1, title: "Customer Feedback Themes - Q2", content: "<p>Top themes from Q2 feedback: onboarding clarity, mobile performance, and support response time. Summary shared with department leads.</p>", reportType: "accomplishment", status: "archived", createdAt: "2024-06-05T12:00:00Z", updatedAt: "2024-06-08T09:30:00Z", deletedAt: null },
      { id: 11, userId: 1, depId: 1, title: "Q2 Release Metrics Summary", content: "<p>Rollup of key delivery metrics for the Q2 release cycle. Overall we hit 4 of 5 targets, with test coverage trailing slightly behind goal.</p><table><thead><tr><th>Metric</th><th>Target</th><th>Actual</th><th>Status</th></tr></thead><tbody><tr><td>On-time Delivery</td><td>90%</td><td>94%</td><td>On Track</td></tr><tr><td>Defect Escape Rate</td><td>&lt; 2%</td><td>1.3%</td><td>On Track</td></tr><tr><td>Test Coverage</td><td>85%</td><td>78%</td><td>Needs Attention</td></tr><tr><td>Avg. Cycle Time</td><td>5 days</td><td>4.2 days</td><td>On Track</td></tr><tr><td>Customer Satisfaction</td><td>4.5 / 5</td><td>4.6 / 5</td><td>On Track</td></tr></tbody></table><p>Recommend prioritizing test coverage improvements in the next sprint before the following release.</p>", reportType: "monthly", status: "submitted", createdAt: "2024-06-21T10:00:00Z", updatedAt: "2024-06-21T10:00:00Z", deletedAt: null }
    ]
  };

  // ─── IMMEDIATE FETCH INTERCEPTOR ───
  const _originalFetch = window.fetch;
  let _interceptorReady = false;
  let _pendingRequests = [];

  window.fetch = function(resource, init) {
    const url = typeof resource === "string" ? resource : (resource?.url || resource?.toString() || "");

    if (!shouldIntercept(url)) {
      return _originalFetch.apply(this, arguments);
    }

    console.log("[demo-mode] fetch() intercepted for API:", url);

    if (!_interceptorReady) {
      console.log("[demo-mode] Interceptor not ready, queuing request for:", url);
      return new Promise((resolve, reject) => {
        _pendingRequests.push({ resource, init, resolve, reject });
      });
    }

    return handleInterceptedFetch(url, init);
  };

  function shouldIntercept(url) {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.pathname.includes("/api/");
    } catch (e) {
      return url.includes("/api/");
    }
  }

  async function handleInterceptedFetch(url, init) {
    const method = (init?.method || "GET").toUpperCase();

    try {
      const response = processApiRequest(url, init);
      if (response) {
        await simulateDelay(50, 200);
        return response;
      }
    } catch (error) {
      console.error("[demo-mode] Error handling request:", error);
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.warn("[demo-mode] Unhandled API route, falling through:", method, url);
    return _originalFetch(url, init);
  }

  function simulateDelay(min, max) {
    return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
  }

  // ─── EARLY AUTH BOOTSTRAP ───
  function earlyBootstrap() {
    const explicit = localStorage.getItem(DEMO_MODE_KEY);
    const hasRole = localStorage.getItem(DEMO_ROLE_KEY);
    const hasUser = localStorage.getItem(DEMO_USER_KEY);

    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocal = protocol === "file:" || host === "localhost" || host === "127.0.0.1";
    const isDemoHost = host.includes("demo") || isLocal;

    if (explicit === "1" || explicit === "true" || hasRole || hasUser || isDemoHost) {
      localStorage.setItem(DEMO_MODE_KEY, "1");

      let role = hasRole;
      if (!role) {
        role = "Admin";
        localStorage.setItem(DEMO_ROLE_KEY, role);
      }

      if (!localStorage.getItem("authToken")) {
        localStorage.setItem("authToken", "demo-token-" + Date.now());
      }

      if (!localStorage.getItem("user") && !localStorage.getItem(DEMO_USER_KEY)) {
        const demoUsers = {
          Admin: { id: 1, nickname: "Admin User", email: "admin@itwms.demo", roleName: "Admin", depName: "Operations", department: { id: 1, name: "Operations" }, role: { id: 1, name: "Admin" } },
          Manager: { id: 2, nickname: "Manager User", email: "manager@itwms.demo", roleName: "Manager", depName: "Operations", department: { id: 1, name: "Operations" }, role: { id: 2, name: "Manager" } },
          Employee: { id: 4, nickname: "Employee User", email: "employee1@itwms.demo", roleName: "Employee", depName: "Engineering", department: { id: 2, name: "Engineering" }, role: { id: 3, name: "Employee" } }
        };
        const user = demoUsers[role] || demoUsers["Admin"];
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
      }

      return true;
    }

    return false;
  }

  const isDemoActive = earlyBootstrap();
  console.log("[demo-mode] Early bootstrap result:", isDemoActive);

  // ─── SAFE REDIRECT INTERCEPTOR ───
  function interceptRedirects() {
    try {
      const originalReplace = window.location.replace;
      const originalAssign = window.location.assign;

      function shouldBlock(urlStr) {
        return isDemoMode() && (urlStr.includes("login.html") || urlStr.includes("/assets/html/login.html"));
      }

      // Only override if properties are writable
      try {
        window.location.replace = function(url) {
          const urlStr = String(url);
          if (shouldBlock(urlStr)) {
            console.log("[demo-mode] 🚫 Blocked redirect to", urlStr);
            return originalReplace.call(window.location, "/index.html");
          }
          return originalReplace.call(window.location, url);
        };
      } catch (e) {
        console.warn("[demo-mode] Cannot override location.replace:", e.message);
      }

      try {
        window.location.assign = function(url) {
          const urlStr = String(url);
          if (shouldBlock(urlStr)) {
            console.log("[demo-mode] 🚫 Blocked navigation to", urlStr);
            return originalAssign.call(window.location, "/index.html");
          }
          return originalAssign.call(window.location, url);
        };
      } catch (e) {
        console.warn("[demo-mode] Cannot override location.assign:", e.message);
      }
    } catch (e) {
      console.warn("[demo-mode] Redirect interceptor failed:", e.message);
    }
  }

  // ─── EMBEDDED DEMO STORE ───
  function initEmbeddedStore() {
    if (window.DemoStore && window.DemoStore.getUsers) {
      console.log("[demo-mode] External DemoStore already available, using it");
      return true;
    }

    console.log("[demo-mode] Initializing embedded DemoStore...");

    function deepClone(obj) {
      if (obj === null || typeof obj !== "object") return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (Array.isArray(obj)) return obj.map(deepClone);
      const cloned = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = deepClone(obj[key]);
        }
      }
      return cloned;
    }

    let store = {
      users: deepClone(EMBEDDED_DEMO_DATA.users),
      departments: deepClone(EMBEDDED_DEMO_DATA.departments),
      notes: deepClone(EMBEDDED_DEMO_DATA.notes),
      tasks: deepClone(EMBEDDED_DEMO_DATA.tasks),
      auditTrails: deepClone(EMBEDDED_DEMO_DATA.auditTrails),
      stats: deepClone(EMBEDDED_DEMO_DATA.stats),
      reports: deepClone(EMBEDDED_DEMO_DATA.reports)
    };

    let nextId = { users: 100, departments: 100, notes: 100, tasks: 100, auditTrails: 100, reports: 100 };
    function generateId(entity) { return nextId[entity]++; }

    function getUsers() { return store.users.filter(u => u.deletedAt === null || u.deletedAt === undefined); }
    function getUserById(id) { return getUsers().find(u => String(u.id) === String(id)); }
    function createUser(data) {
      const user = { id: generateId("users"), email: data.email || "", nickname: data.nickname || "", phoneNum: data.phoneNum || null, depId: data.depId || data.departmentId || null, department: null, role: { id: data.roleId || 3, name: data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee" }, roleName: data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee", depName: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null };
      if (user.depId) { const dept = store.departments.find(d => d.id === user.depId); if (dept) { user.department = { id: dept.id, name: dept.depName || dept.name }; user.depName = dept.depName || dept.name; } }
      store.users.push(user); addAuditTrail("CREATE", "users", String(user.id), null, user); updateStats(); return user;
    }
    function updateUser(id, data) {
      const idx = store.users.findIndex(u => String(u.id) === String(id));
      if (idx === -1) return null;
      const oldUser = deepClone(store.users[idx]);
      const user = store.users[idx];
      if (data.email !== undefined) user.email = data.email;
      if (data.nickname !== undefined) user.nickname = data.nickname;
      if (data.phoneNum !== undefined) user.phoneNum = data.phoneNum;
      if (data.depId !== undefined || data.departmentId !== undefined) {
        user.depId = data.depId || data.departmentId || null;
        const dept = store.departments.find(d => d.id === user.depId);
        if (dept) { user.department = { id: dept.id, name: dept.depName || dept.name }; user.depName = dept.depName || dept.name; }
        else { user.department = null; user.depName = ""; }
      }
      if (data.roleId !== undefined) { user.role = { id: data.roleId, name: data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee" }; user.roleName = data.roleId === 1 ? "Admin" : data.roleId === 2 ? "Manager" : "Employee"; }
      user.updatedAt = new Date().toISOString();
      addAuditTrail("UPDATE", "users", String(id), oldUser, user);
      return user;
    }
    function deleteUser(id) {
      const idx = store.users.findIndex(u => String(u.id) === String(id));
      if (idx === -1) return false;
      const user = store.users[idx]; const oldUser = deepClone(user);
      user.deletedAt = new Date().toISOString();
      addAuditTrail("DELETE", "users", String(id), oldUser, null);
      updateStats(); return true;
    }

    function getDepartments() { return store.departments.filter(d => d.deletedAt === null || d.deletedAt === undefined); }
    function getDepartmentById(id) { return getDepartments().find(d => String(d.id) === String(id)); }
    function createDepartment(data) {
      const dept = { id: generateId("departments"), depName: data.depName || data.name || "", name: data.depName || data.name || "", description: data.description || "", managerId: data.managerId || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null };
      store.departments.push(dept); addAuditTrail("CREATE", "departments", String(dept.id), null, dept); updateStats(); return dept;
    }
    function updateDepartment(id, data) {
      const idx = store.departments.findIndex(d => String(d.id) === String(id));
      if (idx === -1) return null;
      const oldDept = deepClone(store.departments[idx]);
      const dept = store.departments[idx];
      if (data.depName !== undefined || data.name !== undefined) { dept.depName = data.depName || data.name || dept.depName; dept.name = data.depName || data.name || dept.name; }
      if (data.description !== undefined) dept.description = data.description;
      if (data.managerId !== undefined) dept.managerId = data.managerId;
      dept.updatedAt = new Date().toISOString();
      addAuditTrail("UPDATE", "departments", String(id), oldDept, dept);
      return dept;
    }
    function deleteDepartment(id) {
      const idx = store.departments.findIndex(d => String(d.id) === String(id));
      if (idx === -1) return false;
      const dept = store.departments[idx]; const oldDept = deepClone(dept);
      dept.deletedAt = new Date().toISOString();
      addAuditTrail("DELETE", "departments", String(id), oldDept, null);
      updateStats(); return true;
    }

    function getNotes(status) {
      let notes = store.notes.filter(n => n.deletedAt === null || n.deletedAt === undefined);
      if (status && status !== "All") notes = notes.filter(n => n.status === status);
      return notes;
    }
    function getNoteById(id) { return store.notes.find(n => String(n.id) === String(id) && (n.deletedAt === null || n.deletedAt === undefined)); }
    function createNote(data) {
      const note = { id: generateId("notes"), noteName: data.noteName || data.title || "", description: data.description || "", depId: data.depId || data.departmentId || null, department: null, departmentId: data.depId || data.departmentId || null, dueDate: data.dueDate || null, status: data.status || "Active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, tasks: [] };
      if (note.depId) { const dept = store.departments.find(d => d.id === note.depId); if (dept) note.department = { id: dept.id, depName: dept.depName || dept.name, name: dept.depName || dept.name }; }
      store.notes.push(note); addAuditTrail("CREATE", "notes", String(note.id), null, note); updateStats(); return note;
    }
    function updateNote(id, data) {
      const idx = store.notes.findIndex(n => String(n.id) === String(id));
      if (idx === -1) return null;
      const oldNote = deepClone(store.notes[idx]);
      const note = store.notes[idx];
      if (data.noteName !== undefined || data.title !== undefined) note.noteName = data.noteName || data.title || note.noteName;
      if (data.description !== undefined) note.description = data.description;
      if (data.depId !== undefined || data.departmentId !== undefined) {
        note.depId = data.depId || data.departmentId || null; note.departmentId = note.depId;
        const dept = store.departments.find(d => d.id === note.depId);
        if (dept) note.department = { id: dept.id, depName: dept.depName || dept.name, name: dept.depName || dept.name };
      }
      if (data.dueDate !== undefined) note.dueDate = data.dueDate;
      if (data.status !== undefined) note.status = data.status;
      note.updatedAt = new Date().toISOString();
      addAuditTrail("UPDATE", "notes", String(id), oldNote, note);
      return note;
    }
    function deleteNote(id) {
      const idx = store.notes.findIndex(n => String(n.id) === String(id));
      if (idx === -1) return false;
      const note = store.notes[idx]; const oldNote = deepClone(note);
      note.deletedAt = new Date().toISOString();
      addAuditTrail("DELETE", "notes", String(id), oldNote, null);
      updateStats(); return true;
    }

    function getTasks(status, userId, role) {
      let tasks = store.tasks.filter(t => t.deletedAt === null || t.deletedAt === undefined);
      if (role === "Employee" && userId) {
        tasks = tasks.filter(t => {
          const assignedId = t.assignedToUser?.id ?? t.assignedTo;
          const isAssigned = String(assignedId) === String(userId);
          const isCollaborator = Array.isArray(t.collaborators) ? t.collaborators.some(c => String(c.id ?? c.userId) === String(userId)) : false;
          return isAssigned || isCollaborator;
        });
      }
      if (status && status !== "All") tasks = tasks.filter(t => t.taskStatus === status || t.status === status);
      return tasks;
    }
    function getMyTasks(userId, status) {
      let tasks = store.tasks.filter(t => {
        if (t.deletedAt !== null && t.deletedAt !== undefined) return false;
        const assignedId = t.assignedToUser?.id ?? t.assignedTo;
        const isAssigned = String(assignedId) === String(userId);
        const isCollaborator = Array.isArray(t.collaborators) ? t.collaborators.some(c => String(c.id ?? c.userId) === String(userId)) : false;
        return isAssigned || isCollaborator;
      });
      if (status && status !== "All") tasks = tasks.filter(t => t.taskStatus === status || t.status === status);
      return tasks;
    }
    function getTaskById(id) { return store.tasks.find(t => String(t.id) === String(id) && (t.deletedAt === null || t.deletedAt === undefined)); }
    function createTask(data) {
      const task = { id: generateId("tasks"), taskName: data.taskName || data.title || "", description: data.description || "", noteId: data.noteId || null, note: null, assignedTo: data.assignedTo || null, assignedToUser: null, createdBy: data.createdBy || null, createdByUser: null, dueDate: data.dueDate || null, taskStatus: data.taskStatus || data.status || "to_do", status: data.taskStatus || data.status || "to_do", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, collaborators: [] };
      if (task.noteId) { const note = store.notes.find(n => n.id === task.noteId); if (note) task.note = { id: note.id, noteName: note.noteName }; }
      if (task.assignedTo) { const user = store.users.find(u => u.id === task.assignedTo); if (user) task.assignedToUser = { id: user.id, nickname: user.nickname, email: user.email }; }
      if (task.createdBy) { const user = store.users.find(u => u.id === task.createdBy); if (user) task.createdByUser = { id: user.id, nickname: user.nickname, email: user.email }; }
      store.tasks.push(task); addAuditTrail("CREATE", "tasks", String(task.id), null, task); updateStats(); return task;
    }
    function updateTask(id, data) {
      const idx = store.tasks.findIndex(t => String(t.id) === String(id));
      if (idx === -1) return null;
      const oldTask = deepClone(store.tasks[idx]);
      const task = store.tasks[idx];
      if (data.taskName !== undefined || data.title !== undefined) task.taskName = data.taskName || data.title || task.taskName;
      if (data.description !== undefined) task.description = data.description;
      if (data.noteId !== undefined) { task.noteId = data.noteId || null; const note = task.noteId ? store.notes.find(n => n.id === task.noteId) : null; task.note = note ? { id: note.id, noteName: note.noteName } : null; }
      if (data.assignedTo !== undefined) { task.assignedTo = data.assignedTo || null; const user = task.assignedTo ? store.users.find(u => u.id === task.assignedTo) : null; task.assignedToUser = user ? { id: user.id, nickname: user.nickname, email: user.email } : null; }
      if (data.taskStatus !== undefined || data.status !== undefined) { task.taskStatus = data.taskStatus || data.status || task.taskStatus; task.status = task.taskStatus; }
      if (data.dueDate !== undefined) task.dueDate = data.dueDate;
      task.updatedAt = new Date().toISOString();
      addAuditTrail("UPDATE", "tasks", String(id), oldTask, task);
      return task;
    }
    function deleteTask(id) {
      const idx = store.tasks.findIndex(t => String(t.id) === String(id));
      if (idx === -1) return false;
      const task = store.tasks[idx]; const oldTask = deepClone(task);
      task.deletedAt = new Date().toISOString();
      addAuditTrail("DELETE", "tasks", String(id), oldTask, null);
      updateStats(); return true;
    }

    function getTaskCollaborators(taskId) { const task = getTaskById(taskId); if (!task) return []; return task.collaborators || []; }
    function addTaskCollaborator(taskId, userId) {
      const task = getTaskById(taskId); if (!task) return false;
      const user = store.users.find(u => u.id === Number(userId)); if (!user) return false;
      const exists = task.collaborators.some(c => String(c.id ?? c.userId) === String(userId));
      if (exists) return false;
      task.collaborators.push({ id: user.id, userId: user.id, nickname: user.nickname, email: user.email });
      return true;
    }
    function removeTaskCollaborator(taskId, userId) {
      const task = getTaskById(taskId); if (!task) return false;
      const before = task.collaborators.length;
      task.collaborators = task.collaborators.filter(c => String(c.id ?? c.userId) !== String(userId));
      return task.collaborators.length < before;
    }

    // ─── Employee Reports ───
    const REPORT_STATUSES = ["draft", "submitted", "reviewed", "archived"];
    const REPORT_TRANSITIONS = {
      draft: ["submitted"],
      submitted: ["reviewed", "draft"],
      reviewed: ["archived", "submitted"],
      archived: ["reviewed"],
    };

    function decorateReport(report) {
      if (!report) return report;
      const author = store.users.find(u => u.id === report.userId);
      const dept = store.departments.find(d => d.id === report.depId);
      return {
        ...report,
        user: author ? { id: author.id, nickname: author.nickname, email: author.email } : null,
        author: author ? { id: author.id, nickname: author.nickname, email: author.email } : null,
        department: dept ? { id: dept.id, depName: dept.depName || dept.name } : null,
      };
    }

    function getReports(filters) {
      filters = filters || {};
      let reports = store.reports.filter(r => r.deletedAt === null || r.deletedAt === undefined);

      const roleUser = getCurrentUser();
      const roleName = roleUser ? (roleUser.roleName || roleUser.role?.name) : null;

      // Server-side role scoping, mirrors ReportController.php
      if (roleName === "Employee") {
        reports = reports.filter(r => String(r.userId) === String(roleUser.id));
      } else if (roleName === "Manager") {
        const managerDepId = roleUser.depId ?? roleUser.department?.id;
        if (managerDepId != null) {
          reports = reports.filter(r => String(r.depId) === String(managerDepId));
        }
      }

      if (filters.userId || filters.authorId) {
        const uid = filters.userId || filters.authorId;
        reports = reports.filter(r => String(r.userId) === String(uid));
      }
      if (filters.depId) {
        reports = reports.filter(r => String(r.depId) === String(filters.depId));
      }
      if (filters.status) {
        reports = reports.filter(r => r.status === filters.status);
      } else {
        // Exclude archived by default, matching EmployeeReport::filter()
        reports = reports.filter(r => r.status !== "archived");
      }
      if (filters.from) {
        reports = reports.filter(r => r.createdAt >= filters.from);
      }
      if (filters.to) {
        reports = reports.filter(r => r.createdAt <= filters.to + "T23:59:59Z");
      }

      // Drafts are only visible to their own author, regardless of role
      reports = reports.filter(r => r.status !== "draft" || String(r.userId) === String(roleUser?.id));

      reports = reports.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
      return reports.map(decorateReport);
    }

    function getReportById(id) {
      const report = store.reports.find(r => String(r.id) === String(id) && (r.deletedAt === null || r.deletedAt === undefined));
      return report ? decorateReport(report) : null;
    }

    function createReport(data) {
      const authUser = getCurrentUser();
      const roleName = authUser ? (authUser.roleName || authUser.role?.name) : "Employee";
      const report = {
        id: generateId("reports"),
        userId: authUser?.id || null,
        depId: roleName === "Admin" && data.depId ? data.depId : (authUser?.depId ?? authUser?.department?.id ?? null),
        title: data.title || "",
        content: data.content || "",
        reportType: data.reportType || "general",
        status: REPORT_STATUSES.includes(data.status) ? data.status : "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      store.reports.push(report);
      addAuditTrail("CREATE", "reports", String(report.id), null, report);
      return decorateReport(report);
    }

    function updateReport(id, data) {
      const idx = store.reports.findIndex(r => String(r.id) === String(id));
      if (idx === -1) return null;
      const authUser = getCurrentUser();
      const roleName = authUser ? (authUser.roleName || authUser.role?.name) : "Employee";
      const report = store.reports[idx];
      const oldReport = deepClone(report);

      // Only draft reports can be edited by non-admins (matches EmployeeReport::update)
      if (report.status !== "draft" && roleName !== "Admin") {
        return { __error: "Only draft reports can be edited. Submit for review instead." };
      }

      if (data.title !== undefined) report.title = data.title;
      if (data.content !== undefined) report.content = data.content;
      if (data.reportType !== undefined) report.reportType = data.reportType;
      if (data.status !== undefined && REPORT_STATUSES.includes(data.status)) report.status = data.status;
      report.updatedAt = new Date().toISOString();

      addAuditTrail("UPDATE", "reports", String(id), oldReport, report);
      return decorateReport(report);
    }

    function updateReportStatus(id, status) {
      const idx = store.reports.findIndex(r => String(r.id) === String(id));
      if (idx === -1) return { __error: "Report not found" };
      if (!REPORT_STATUSES.includes(status)) return { __error: "Invalid status" };

      const report = store.reports[idx];
      const oldReport = deepClone(report);
      const authUser = getCurrentUser();
      const roleName = authUser ? (authUser.roleName || authUser.role?.name) : "Employee";
      const isOwner = authUser && String(authUser.id) === String(report.userId);

      const currentStatus = report.status;
      if (currentStatus !== status && !(REPORT_TRANSITIONS[currentStatus] || []).includes(status)) {
        return { __error: `Invalid status transition from '${currentStatus}' to '${status}'` };
      }

      if (status === "submitted" && !isOwner && roleName !== "Admin") {
        return { __error: "Forbidden: Only the report owner can submit" };
      }
      if ((status === "reviewed" || status === "archived") && roleName !== "Admin" && roleName !== "Manager") {
        return { __error: "Forbidden: Only admin or manager can review/archive" };
      }
      if (roleName === "Manager") {
        const managerDepId = authUser.depId ?? authUser.department?.id;
        if (managerDepId == null || String(managerDepId) !== String(report.depId)) {
          return { __error: "Forbidden: Can only manage reports in your own department" };
        }
      }

      report.status = status;
      report.updatedAt = new Date().toISOString();
      addAuditTrail("UPDATE", "reports", String(id), oldReport, report);
      return decorateReport(report);
    }

    function getAuditTrails(filters) {
      let trails = [...store.auditTrails];
      if (filters) {
        if (filters.id) trails = trails.filter(t => String(t.id) === String(filters.id).trim());
        if (filters.recordId) trails = trails.filter(t => String(t.recordId) === String(filters.recordId).trim());
        if (filters.table) trails = trails.filter(t => String(t.tableName || "").toLowerCase() === String(filters.table).toLowerCase());
        if (filters.userId) trails = trails.filter(t => String(t.userId) === String(filters.userId));
        if (filters.actionType) trails = trails.filter(t => String(t.action || "").toUpperCase() === String(filters.actionType).toUpperCase());
        if (filters.startDate) trails = trails.filter(t => { const d = t.createdAt ? t.createdAt.slice(0, 10) : ""; return d >= filters.startDate; });
        if (filters.endDate) trails = trails.filter(t => { const d = t.createdAt ? t.createdAt.slice(0, 10) : ""; return d <= filters.endDate; });
        if (filters.search) { const term = String(filters.search).trim().toLowerCase(); trails = trails.filter(t => { const haystack = Object.values(t).map(v => v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)).join(" ").toLowerCase(); return haystack.includes(term); }); }
      }
      return trails;
    }
    function addAuditTrail(action, tableName, recordId, oldData, newData) {
      const currentUser = getCurrentUser();
      const trail = { id: generateId("auditTrails"), action, tableName, recordId, userId: currentUser?.id || 1, userEmail: currentUser?.email || "demo@itwms.demo", oldData: oldData ? JSON.stringify(oldData) : null, newData: newData ? JSON.stringify(newData) : null, createdAt: new Date().toISOString() };
      store.auditTrails.unshift(trail); return trail;
    }

    function getStats(scope) {
      const activeTasks = store.tasks.filter(t => t.deletedAt === null || t.deletedAt === undefined).length;
      const activeNotes = store.notes.filter(n => n.deletedAt === null || n.deletedAt === undefined).length;
      return { overview: { tasks: { total: activeTasks }, notes: { total: activeNotes } } };
    }
    function updateStats() { store.stats = getStats(); }

    let currentUser = null;
    function setCurrentUser(user) { currentUser = user; if (user) localStorage.setItem("demoUser", JSON.stringify(user)); else localStorage.removeItem("demoUser"); }
    function getCurrentUser() { if (currentUser) return currentUser; try { const saved = localStorage.getItem("demoUser"); if (saved) { currentUser = JSON.parse(saved); return currentUser; } } catch (e) {} return null; }
    function getUserProfile() {
      const user = getCurrentUser(); if (!user) return null;
      const fullUser = store.users.find(u => u.id === user.id);
      if (fullUser) return { ...fullUser, name: fullUser.nickname || fullUser.name || fullUser.username, workspaceName: "ITWMS Demo", company: "ITWMS Demo Corp" };
      return { ...user, workspaceName: "ITWMS Demo", company: "ITWMS Demo Corp" };
    }

    window.DemoStore = {
      init: function() { console.log("[embedded DemoStore] init called"); },
      getUsers, getUserById, createUser, updateUser, deleteUser,
      getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment,
      getNotes, getNoteById, createNote, updateNote, deleteNote,
      getTasks, getMyTasks, getTaskById, createTask, updateTask, deleteTask,
      getTaskCollaborators, addTaskCollaborator, removeTaskCollaborator,
      getReports, getReportById, createReport, updateReport, updateReportStatus,
      getAuditTrails,
      getStats,
      setCurrentUser, getCurrentUser, getUserProfile
    };

    console.log("[demo-mode] ✅ Embedded DemoStore initialized with", store.users.length, "users,", store.departments.length, "departments,", store.notes.length, "notes,", store.tasks.length, "tasks");
    return true;
  }

  // ─── API REQUEST ROUTER ───
  function processApiRequest(url, init) {
    const method = (init?.method || "GET").toUpperCase();
    let parsedUrl;

    try {
      parsedUrl = new URL(url, window.location.href);
    } catch (e) {
      try {
        parsedUrl = new URL(url, window.location.origin);
      } catch (e2) {
        console.error("[demo-mode] Cannot parse URL:", url);
        return null;
      }
    }

    const path = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);

    let body = null;
    if (init?.body) {
      try { body = JSON.parse(init.body); } catch (e) { body = init.body; }
    }

    // Ensure DemoStore is ready
    if (!window.DemoStore || !window.DemoStore.getUsers) {
      console.warn("[demo-mode] DemoStore not ready, initializing embedded store...");
      initEmbeddedStore();
    }

    if (!window.DemoStore || !window.DemoStore.getUsers) {
      console.error("[demo-mode] CRITICAL: DemoStore still not available after initialization!");
      return errorResponse("Demo store initialization failed", 500);
    }

    // ─── AUTH ROUTES ───
    if (path === "/api/auth/login" || path === "/api/auth/login/") return handleLogin(body);
    if (path === "/api/auth/me" || path === "/api/auth/me/") return handleGetProfile();
    if (path === "/api/auth/logout" || path === "/api/auth/logout/") return handleLogout();
    if (path === "/api/auth/forgot-password" || path === "/api/auth/forgot-password/") return handleForgotPassword(body);
    if (path === "/api/auth/reset-password" || path === "/api/auth/reset-password/") return handleResetPassword(body);

    // ─── DASHBOARD ───
    if (path === "/api/dashboard/stats" || path === "/api/dashboard/stats/") return handleGetStats(query);

    // ─── USERS ───
    const usersMatch = path.match(/^\/api\/users\/?$/);
    if (usersMatch) {
      if (method === "GET") return handleGetUsers(query);
      if (method === "POST") return handleCreateUser(body);
    }
    const userByIdMatch = path.match(/^\/api\/users\/(\d+)\/?$/);
    if (userByIdMatch) {
      const id = userByIdMatch[1];
      if (method === "GET") return handleGetUserById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateUser(id, body);
      if (method === "DELETE") return handleDeleteUser(id);
    }
    const userRatingsMatch = path.match(/^\/api\/users\/(\d+)\/ratings\/?$/);
    if (userRatingsMatch) {
      const id = userRatingsMatch[1];
      if (method === "GET") return handleGetUserRatings(id);
    }

    // ─── DEPARTMENTS ───
    const deptsMatch = path.match(/^\/api\/departments\/?$/);
    if (deptsMatch) {
      if (method === "GET") return handleGetDepartments();
      if (method === "POST") return handleCreateDepartment(body);
    }
    const deptByIdMatch = path.match(/^\/api\/departments\/(\d+)\/?$/);
    if (deptByIdMatch) {
      const id = deptByIdMatch[1];
      if (method === "GET") return handleGetDepartmentById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateDepartment(id, body);
      if (method === "DELETE") return handleDeleteDepartment(id);
    }

    // ─── NOTES ───
    const notesMatch = path.match(/^\/api\/notes\/?$/);
    if (notesMatch) {
      if (method === "GET") return handleGetNotes(query);
      if (method === "POST") return handleCreateNote(body);
    }
    const noteByIdMatch = path.match(/^\/api\/notes\/(\d+)\/?$/);
    if (noteByIdMatch) {
      const id = noteByIdMatch[1];
      if (method === "GET") return handleGetNoteById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateNote(id, body);
      if (method === "DELETE") return handleDeleteNote(id);
    }

    // ─── TASKS ───
    const tasksMatch = path.match(/^\/api\/tasks\/?$/);
    if (tasksMatch) {
      if (method === "GET") return handleGetTasks(query);
      if (method === "POST") return handleCreateTask(body);
    }
    const myTasksMatch = path.match(/^\/api\/tasks\/my\/?$/);
    if (myTasksMatch) {
      if (method === "GET") return handleGetMyTasks(query);
    }
    const taskByIdMatch = path.match(/^\/api\/tasks\/(\d+)\/?$/);
    if (taskByIdMatch) {
      const id = taskByIdMatch[1];
      if (method === "GET") return handleGetTaskById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateTask(id, body);
      if (method === "DELETE") return handleDeleteTask(id);
    }

    // ─── TASK COLLABORATORS ───
    const collabMatch = path.match(/^\/api\/tasks\/(\d+)\/collaborators\/?$/);
    if (collabMatch) {
      const taskId = collabMatch[1];
      if (method === "GET") return handleGetCollaborators(taskId);
      if (method === "POST") return handleAddCollaborator(taskId, body);
    }
    const removeCollabMatch = path.match(/^\/api\/tasks\/(\d+)\/collaborators\/(\d+)\/?$/);
    if (removeCollabMatch) {
      const taskId = removeCollabMatch[1];
      const userId = removeCollabMatch[2];
      if (method === "DELETE") return handleRemoveCollaborator(taskId, userId);
    }

    // ─── TASK RATING ───
    const ratingMatch = path.match(/^\/api\/tasks\/(\d+)\/rating\/?$/);
    if (ratingMatch) {
      const taskId = ratingMatch[1];
      if (method === "GET") return handleGetTaskRating(taskId);
    }
    const rateMatch = path.match(/^\/api\/tasks\/(\d+)\/rate\/?$/);
    if (rateMatch) {
      const taskId = rateMatch[1];
      if (method === "POST" || method === "PUT") return handleRateTask(taskId, body);
    }

    // ─── TASK REDO ───
    const redoMatch = path.match(/^\/api\/tasks\/(\d+)\/redo\/?$/);
    if (redoMatch) {
      const taskId = redoMatch[1];
      if (method === "POST") return handleRedoTask(taskId, body);
    }

    // ─── TASK ATTACHMENTS ───
    const attachmentsMatch = path.match(/^\/api\/tasks\/(\d+)\/attachments\/?$/);
    if (attachmentsMatch) {
      const taskId = attachmentsMatch[1];
      if (method === "GET") return handleGetTaskAttachments(taskId);
      if (method === "POST") return handleAddTaskAttachment(taskId, body);
    }
    const attachmentByIdMatch = path.match(/^\/api\/tasks\/(\d+)\/attachments\/(\d+)\/?$/);
    if (attachmentByIdMatch) {
      const taskId = attachmentByIdMatch[1];
      const attachmentId = attachmentByIdMatch[2];
      if (method === "DELETE") return handleRemoveTaskAttachment(taskId, attachmentId);
    }

    // ─── REPORTS ───
    const reportsMatch = path.match(/^\/api\/reports\/?$/);
    if (reportsMatch) {
      if (method === "GET") return handleGetReports(query);
      if (method === "POST") return handleCreateReport(body);
    }
    const reportStatusMatch = path.match(/^\/api\/reports\/(\d+)\/status\/?$/);
    if (reportStatusMatch) {
      const id = reportStatusMatch[1];
      if (method === "PUT" || method === "PATCH") return handleUpdateReportStatus(id, body);
    }
    const reportByIdMatch = path.match(/^\/api\/reports\/(\d+)\/?$/);
    if (reportByIdMatch) {
      const id = reportByIdMatch[1];
      if (method === "GET") return handleGetReportById(id);
      if (method === "PUT" || method === "PATCH") return handleUpdateReport(id, body);
    }

    // ─── AUDIT TRAILS ───
    const auditMatch = path.match(/^\/api\/audit-trails\/?$/);
    if (auditMatch) {
      if (method === "GET") return handleGetAuditTrails(query);
    }

    console.warn("[demo-mode] Unhandled route:", method, path);
    return null;
  }

  // ─── Response Helpers ───
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify({ success: true, data }), {
      status, headers: { "Content-Type": "application/json" },
    });
  }
  function envelopeResponse(data, pagination = null, status = 200) {
    const payload = { success: true, data };
    if (pagination) payload.pagination = pagination;
    return new Response(JSON.stringify(payload), {
      status, headers: { "Content-Type": "application/json" },
    });
  }
  function errorResponse(message, status = 400) {
    return new Response(
      JSON.stringify({ success: false, message, error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
  function emptyResponse(status = 204) {
    return new Response(null, { status });
  }

  // ─── Auth Handlers ───
  function handleLogin(body) {
    if (!body || (!body.email && !body.username)) return errorResponse("Please provide email/username and password", 401);
    const identifier = body.email || body.username;
    const user = window.DemoStore.getUsers().find(u => u.email === identifier || u.nickname === identifier || u.username === identifier);
    if (!user) return errorResponse("Invalid credentials", 401);
    const token = "demo-token-" + user.id + "-" + Date.now();
    window.DemoStore.setCurrentUser(user);
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    return jsonResponse({ token, user });
  }
  function handleGetProfile() {
    const profile = window.DemoStore.getUserProfile();
    if (!profile) return errorResponse("Not authenticated", 401);
    return jsonResponse(profile);
  }
  function handleLogout() {
    window.DemoStore.setCurrentUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(DEMO_ROLE_KEY);
    setTimeout(() => window.location.replace("/index.html"), 100);
    return jsonResponse({ message: "Logged out successfully" });
  }
  function handleForgotPassword(body) {
    const identifier = body?.email || body?.username || "";
    if (!identifier) return errorResponse("Please provide an email or username");
    return jsonResponse({ message: "If the account exists, a reset link has been sent to " + identifier });
  }
  function handleResetPassword(body) {
    if (!body?.password || !body?.token) return errorResponse("Password and token are required");
    return jsonResponse({ message: "Password reset successfully" });
  }

  // ─── Stats Handler ───
  function handleGetStats(query) {
    return jsonResponse(window.DemoStore.getStats(query.scope));
  }

  // ─── User Handlers ───
  function handleGetUsers(query) {
    let users = window.DemoStore.getUsers();
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "100", 10);
    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return envelopeResponse(users.slice(start, start + limit), { page, limit, total, totalPages });
  }
  function handleGetUserById(id) {
    const user = window.DemoStore.getUserById(id);
    if (!user) return errorResponse("User not found", 404);
    return jsonResponse(user);
  }
  function handleCreateUser(body) {
    if (!body?.email || !body?.nickname) return errorResponse("Email and nickname are required");
    return jsonResponse(window.DemoStore.createUser(body), 201);
  }
  function handleUpdateUser(id, body) {
    const user = window.DemoStore.updateUser(id, body);
    if (!user) return errorResponse("User not found", 404);
    return jsonResponse(user);
  }
  function handleDeleteUser(id) {
    const success = window.DemoStore.deleteUser(id);
    if (!success) return errorResponse("User not found", 404);
    return emptyResponse(204);
  }
  function handleGetUserRatings(id) {
    const ratings = window.DemoStore.getUserRatings(id);
    return jsonResponse(ratings);
  }

  // ─── Department Handlers ───
  function handleGetDepartments() {
    return jsonResponse(window.DemoStore.getDepartments());
  }
  function handleGetDepartmentById(id) {
    const dept = window.DemoStore.getDepartmentById(id);
    if (!dept) return errorResponse("Department not found", 404);
    return jsonResponse(dept);
  }
  function handleCreateDepartment(body) {
    if (!body?.depName && !body?.name) return errorResponse("Department name is required");
    return jsonResponse(window.DemoStore.createDepartment(body), 201);
  }
  function handleUpdateDepartment(id, body) {
    const dept = window.DemoStore.updateDepartment(id, body);
    if (!dept) return errorResponse("Department not found", 404);
    return jsonResponse(dept);
  }
  function handleDeleteDepartment(id) {
    const success = window.DemoStore.deleteDepartment(id);
    if (!success) return errorResponse("Department not found", 404);
    return emptyResponse(204);
  }

  // ─── Note Handlers ───
  function handleGetNotes(query) {
    return jsonResponse(window.DemoStore.getNotes(query.status));
  }
  function handleGetNoteById(id) {
    const note = window.DemoStore.getNoteById(id);
    if (!note) return errorResponse("Note not found", 404);
    const tasks = window.DemoStore.getTasks().filter(t => {
      const nid = t.note?.id ?? t.noteId;
      return String(nid) === String(id);
    });
    note.tasks = tasks;
    return jsonResponse(note);
  }
  function handleCreateNote(body) {
    if (!body?.noteName && !body?.title) return errorResponse("Note name is required");
    return jsonResponse(window.DemoStore.createNote(body), 201);
  }
  function handleUpdateNote(id, body) {
    const note = window.DemoStore.updateNote(id, body);
    if (!note) return errorResponse("Note not found", 404);
    return jsonResponse(note);
  }
  function handleDeleteNote(id) {
    const success = window.DemoStore.deleteNote(id);
    if (!success) return errorResponse("Note not found", 404);
    return emptyResponse(204);
  }

  // ─── Task Handlers ───
  function handleGetTasks(query) {
    const currentUser = window.DemoStore.getCurrentUser();
    const role = currentUser?.roleName || "Employee";
    const userId = currentUser?.id;
    return jsonResponse(window.DemoStore.getTasks(query.status, userId, role));
  }
  function handleGetMyTasks(query) {
    const currentUser = window.DemoStore.getCurrentUser();
    return jsonResponse(window.DemoStore.getMyTasks(currentUser?.id, query.status));
  }
  function handleGetTaskById(id) {
    const task = window.DemoStore.getTaskById(id);
    if (!task) return errorResponse("Task not found", 404);
    return jsonResponse(task);
  }
  function handleCreateTask(body) {
    if (!body?.taskName && !body?.title) return errorResponse("Task name is required");
    return jsonResponse(window.DemoStore.createTask(body), 201);
  }
  function handleUpdateTask(id, body) {
    const task = window.DemoStore.updateTask(id, body);
    if (!task) return errorResponse("Task not found", 404);
    return jsonResponse(task);
  }
  function handleDeleteTask(id) {
    const success = window.DemoStore.deleteTask(id);
    if (!success) return errorResponse("Task not found", 404);
    return emptyResponse(204);
  }

  // ─── Collaborator Handlers ───
  function handleGetCollaborators(taskId) {
    return jsonResponse(window.DemoStore.getTaskCollaborators(taskId));
  }
  function handleAddCollaborator(taskId, body) {
    if (!body?.userId) return errorResponse("userId is required");
    const success = window.DemoStore.addTaskCollaborator(taskId, body.userId);
    if (!success) return errorResponse("Collaborator already exists or invalid user", 409);
    return jsonResponse({ message: "Collaborator added" }, 201);
  }
  function handleRemoveCollaborator(taskId, userId) {
    const success = window.DemoStore.removeTaskCollaborator(taskId, userId);
    if (!success) return errorResponse("Collaborator not found", 404);
    return emptyResponse(204);
  }

  // ─── Task Rating Handlers ───
  function handleGetTaskRating(taskId) {
    const rating = window.DemoStore.getTaskRating(taskId);
    if (!rating) return errorResponse("No rating found", 404);
    return jsonResponse(rating);
  }
  function handleRateTask(taskId, body) {
    if (body?.rating == null) return errorResponse("rating is required");
    const result = window.DemoStore.rateTask(taskId, body);
    if (!result) return errorResponse("Task not found", 404);
    if (result.__error) return errorResponse(result.__error, 403);
    return jsonResponse(result);
  }

  // ─── Task Redo Handler ───
  function handleRedoTask(taskId, body) {
    if (!body?.taskName) return errorResponse("taskName is required");
    const result = window.DemoStore.redoTask(taskId, body || {});
    if (!result) return errorResponse("Original task not found", 404);
    if (result.__error) return errorResponse(result.__error, 403);
    return jsonResponse(result, 201);
  }

  // ─── Task Attachment Handlers ───
  function handleGetTaskAttachments(taskId) {
    const attachments = window.DemoStore.getTaskAttachments(taskId);
    return jsonResponse(attachments || []);
  }
  function handleAddTaskAttachment(taskId, body) {
    if (!body?.fileName) return errorResponse("fileName is required");
    const result = window.DemoStore.addTaskAttachment(taskId, body);
    if (!result) return errorResponse("Task not found", 404);
    return jsonResponse(result, 201);
  }
  function handleRemoveTaskAttachment(taskId, attachmentId) {
    const success = window.DemoStore.removeTaskAttachment(taskId, attachmentId);
    if (!success) return errorResponse("Attachment not found", 404);
    return emptyResponse(204);
  }

  // ─── Report Handlers ───
  function handleGetReports(query) {
    const filters = {
      userId: query.userId || query.authorId || "",
      authorId: query.authorId || "",
      depId: query.depId || "",
      status: query.status || "",
      from: query.from || "",
      to: query.to || "",
    };
    const reports = window.DemoStore.getReports(filters);
    const total = reports.length;
    return envelopeResponse(reports, { total, page: 1, limit: total || 1, totalPages: 1 });
  }
  function handleGetReportById(id) {
    const report = window.DemoStore.getReportById(id);
    if (!report) return errorResponse("Report not found", 404);
    return jsonResponse(report);
  }
  function handleCreateReport(body) {
    if (!body?.title) return errorResponse("title is required");
    if (!body?.content) return errorResponse("content is required");
    const result = window.DemoStore.createReport(body);
    if (result?.__error) return errorResponse(result.__error, 400);
    return jsonResponse(result, 201);
  }
  function handleUpdateReport(id, body) {
    const result = window.DemoStore.updateReport(id, body || {});
    if (!result) return errorResponse("Report not found", 404);
    if (result.__error) return errorResponse(result.__error, 403);
    return jsonResponse(result);
  }
  function handleUpdateReportStatus(id, body) {
    if (!body?.status) return errorResponse("status is required");
    const result = window.DemoStore.updateReportStatus(id, body.status);
    if (result?.__error) return errorResponse(result.__error, 403);
    return jsonResponse(result);
  }

  // ─── Audit Trail Handlers ───
  function handleGetAuditTrails(query) {
    const filters = {
      id: query.id || "", recordId: query.recordId || "", table: query.table || "",
      search: query.search || "", userId: query.userId || "", actionType: query.actionType || "",
      startDate: query.startDate || "", endDate: query.endDate || "",
    };
    let trails = window.DemoStore.getAuditTrails(filters);
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "10", 10);
    const total = trails.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return envelopeResponse(trails.slice(start, start + limit), { page, limit, total, totalPages });
  }

  // ─── INITIALIZATION ───
  function isDemoMode() {
    const explicit = localStorage.getItem(DEMO_MODE_KEY);
    if (explicit === "1" || explicit === "true") return true;
    if (explicit === "0" || explicit === "false") return false;
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host.includes("demo")) return true;
    return false;
  }

  function activate() {
    if (!isDemoMode()) {
      console.log("[demo-mode] Demo mode is disabled.");
      return;
    }

    // Initialize store FIRST before anything else
    if (!window.DemoStore || !window.DemoStore.getUsers) {
      initEmbeddedStore();
    }

    // Mark interceptor as ready IMMEDIATELY after store is ready
    _interceptorReady = true;
    console.log("[demo-mode] ✅ Interceptor ready. DemoStore available:", !!window.DemoStore);

    // Then try to intercept redirects (non-critical)
    interceptRedirects();

    // Process any queued requests
    if (_pendingRequests.length > 0) {
      console.log("[demo-mode] Processing", _pendingRequests.length, "queued requests");
      _pendingRequests.forEach(({ resource, init, resolve, reject }) => {
        const url = typeof resource === "string" ? resource : (resource?.url || resource?.toString() || "");
        if (shouldIntercept(url)) {
          handleInterceptedFetch(url, init).then(resolve).catch(reject);
        } else {
          _originalFetch(resource, init).then(resolve).catch(reject);
        }
      });
      _pendingRequests = [];
    }
  }

  // Run immediately
  activate();

  // Also try when DOM is ready (backup for async script loading)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      if (!_interceptorReady) {
        console.log("[demo-mode] Activating on DOMContentLoaded");
        activate();
      }
    });
  }

  // Expose toggle function
  window.toggleDemoMode = function(enabled) {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? "1" : "0");
    window.location.reload();
  };
  window.isDemoModeActive = isDemoMode;
})();
