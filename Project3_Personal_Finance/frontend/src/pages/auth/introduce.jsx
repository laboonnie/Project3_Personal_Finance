import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IntroduceFeaturePanel } from "./IntroduceFeatureDetail";
import "./introduce.css";
import debtIntro from "../../images/DebtIntro.jpg";
import budgetIntro from "../../images/BudgetIntro.jpg";
import analytics from "../../images/analysis.jpg";
import poster from "../../images/poster.jpg";

export default function Introduce() {
  const navigate = useNavigate();
  const [featureId, setFeatureId] = useState(null);

  useEffect(() => {
    if (!featureId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setFeatureId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [featureId]);

  return (
    <div className="intro-shell">
      <div className="intro-frame">
        {/* TOPBAR HEADER */}
        <div className="intro-topbar">
          <div className="intro-brand">
            <div className="intro-logo" aria-hidden="true">
              <i className="bi bi-wallet2" />
            </div>
            <div>
              <div className="intro-brand-title">FinSmart Wallet</div>
              <div className="intro-brand-subtitle">Personal Finance Platform</div>
            </div>
          </div>
          <button
            type="button"
            className="intro-btn secondary"
            style={{ height: "38px", padding: "0 18px", fontSize: "13.5px" }}
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>
        </div>

        {/* HERO SECTION */}
        <div className="intro-section">
          <div className="intro-hero">
            <div className="intro-hero-left">
              <h1>Your Smart Wallet & Expense Solution</h1>
              <p className="intro-hero-desc">
                Manage your money effortlessly with our modern wallet app. Track expenses, send payments, and gain full control of your financial health all in one place.
              </p>
              <div className="intro-bullets">
                <div className="intro-bullet-item">
                  <span className="intro-bullet-icon">✓</span>
                  Real-time transaction tracking & analytics
                </div>
                <div className="intro-bullet-item">
                  <span className="intro-bullet-icon">✓</span>
                  Instant 6-Jars budget distribution system
                </div>
                <div className="intro-bullet-item">
                  <span className="intro-bullet-icon">✓</span>
                  Smart debt management & payment schedules
                </div>
              </div>
            </div>
            <div className="intro-hero-right">
              <img src={poster} alt="Wallet app preview" className="intro-hero-img" />
            </div>
          </div>
        </div>

        {/* KEY FEATURES */}
        <div className="intro-section">
          <div className="intro-section-title">Key Features</div>
          <div className="intro-section-desc">Click on any card to explore feature details</div>
          <div className="intro-grid3">
            <button
              type="button"
              className="intro-shot-clickable"
              onClick={() => setFeatureId("1")}
            >
              <div className="intro-shot-title">
                Debt Management
                <i className="bi bi-arrow-right" />
              </div>
              <img src={debtIntro} alt="Debt Management" className="intro-shot-img" />
            </button>

            <button
              type="button"
              className="intro-shot-clickable"
              onClick={() => setFeatureId("2")}
            >
              <div className="intro-shot-title">
                Budget Tracking
                <i className="bi bi-arrow-right" />
              </div>
              <img src={budgetIntro} alt="Budget Tracking" className="intro-shot-img" />
            </button>

            <button
              type="button"
              className="intro-shot-clickable"
              onClick={() => setFeatureId("3")}
            >
              <div className="intro-shot-title">
                Expense Analytics
                <i className="bi bi-arrow-right" />
              </div>
              <img src={analytics} alt="Expense Analytics" className="intro-shot-img" />
            </button>
          </div>
        </div>

        {/* WHY CHOOSE US */}
        <div className="intro-section">
          <div className="intro-section-title">Why Choose Us</div>
          <div className="intro-section-desc">Built for reliability, speed, and intelligence</div>
          <div className="intro-grid3">
            <div className="intro-card">
              <div className="intro-card-head">
                <div className="intro-card-icon"><i className="bi bi-shield-check" /></div>
                <div className="intro-card-title">Secure & Reliable</div>
              </div>
              <div className="intro-card-body">
                Bank-level encryption protects your financial data. Trusted by thousands of users with zero security breaches.
              </div>
            </div>

            <div className="intro-card">
              <div className="intro-card-head">
                <div className="intro-card-icon"><i className="bi bi-lightning-charge-fill" /></div>
                <div className="intro-card-title">Fast & Easy</div>
              </div>
              <div className="intro-card-body">
                Set up your wallet in seconds. Track and organize your monthly finances instantly with just a few clicks.
              </div>
            </div>

            <div className="intro-card">
              <div className="intro-card-head">
                <div className="intro-card-icon"><i className="bi bi-graph-up-arrow" /></div>
                <div className="intro-card-title">Smart Analytics</div>
              </div>
              <div className="intro-card-body">
                Track spending patterns, get visual insights, and make informed decisions with detailed monthly reports.
              </div>
            </div>
          </div>
        </div>

        {/* REVIEWS */}
        <div className="intro-section">
          <div className="intro-section-title">What Our Users Say</div>
          <div className="intro-section-desc">Real feedback from satisfied users</div>
          <div className="intro-reviews">
            <div className="intro-review">
              <div className="intro-review-top">
                <div className="intro-review-avatar">SJ</div>
                <div>
                  <div className="intro-review-name">Sarah Johnson</div>
                  <div className="intro-review-stars">★★★★★ 5/5</div>
                </div>
              </div>
              <div className="intro-review-body">
                "This wallet app has completely changed how I manage my finances. The interface is intuitive and analytics give me clarity on spending habits."
              </div>
            </div>

            <div className="intro-review">
              <div className="intro-review-top">
                <div className="intro-review-avatar">MC</div>
                <div>
                  <div className="intro-review-name">Michael Chen</div>
                  <div className="intro-review-stars">★★★★★ 5/5</div>
                </div>
              </div>
              <div className="intro-review-body">
                "Fast, secure, and reliable platform. I've been using it for 6 months. Never had any issues and customer support team is fantastic."
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CALL TO ACTION */}
        <div className="intro-actions">
          <div className="intro-ctaRow">
            <button
              type="button"
              className="intro-btn cta"
              onClick={() => navigate("/register")}
            >
              Get Started Free <i className="bi bi-arrow-right-short" style={{ fontSize: "20px" }} />
            </button>
            <button
              type="button"
              className="intro-btn secondary"
              onClick={() => navigate("/login")}
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>

      {/* FEATURE DETAIL MODAL */}
      {featureId && (
        <div
          className="intro-feature-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-feature-dialog-title"
        >
          <div
            className="intro-feature-modal-backdrop"
            role="presentation"
            onClick={() => setFeatureId(null)}
          />
          <div className="intro-feature-modal-panel">
            <IntroduceFeaturePanel
              id={featureId}
              onClose={() => setFeatureId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}