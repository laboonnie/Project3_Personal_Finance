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
        <div className="intro-topbar">
          <div className="intro-brand">
            <div className="intro-logo" aria-hidden="true">
              <i className="bi bi-wallet2" />
            </div>
            <div className="intro-brand-text">
              <div className="skel skel-text w-40 h-md" />
              <div className="skel skel-text w-30" />
            </div>
          </div>
        </div>

        <div className="intro-section">
          <div style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "var(--intro-text)" }}>Your Smart Wallet Solution</div>
          <div className="intro-divider" />
          <div className="intro-hero">
            <div className="intro-hero-left">
              <div style={{ fontSize: "16px", lineHeight: "1.6", color: "var(--intro-muted)", marginBottom: "12px" }}>Manage your money effortlessly with our modern wallet app. Track expenses, send payments, and control your finances all in one place.</div>
              <div className="intro-bullets">
                <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--intro-text)", paddingLeft: "20px", position: "relative" }}>
                  <span style={{ position: "absolute", left: "0" }}>✓</span>
                  Real-time transaction tracking
                </div>
                <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--intro-text)", paddingLeft: "20px", position: "relative" }}>
                  <span style={{ position: "absolute", left: "0" }}>✓</span>
                  Instant money transfers to anyone
                </div>
              </div>
            </div>
            <div className="intro-hero-right">
              <img src={poster} alt="Wallet app preview" className="skel skel-image" />
            </div>
          </div>
        </div>

        <div className="intro-section">
          <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--intro-text)" }}>Key Features</div>
          <div className="intro-divider" />
          <div className="intro-grid3">
            <button
              type="button"
              className="intro-shot intro-shot-clickable"
              onClick={() => setFeatureId("1")}
            >
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--intro-text)" }}>Debt Management</div>
              <img src={debtIntro} alt="Wallet app preview" className="skel skel-image sm" />
            </button>
            <button
              type="button"
              className="intro-shot intro-shot-clickable"
              onClick={() => setFeatureId("2")}
            >
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--intro-text)" }}>Budget Tracking</div>
              <img src={budgetIntro} alt="Wallet app preview" className="skel skel-image sm" />
            </button>
            <button
              type="button"
              className="intro-shot intro-shot-clickable"
              onClick={() => setFeatureId("3")}
            >
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--intro-text)" }}>Expense Analytics</div>
              <img src={analytics} alt="Wallet app preview" className="skel skel-image sm" />
            </button>
          </div>
        </div>

        <div className="intro-section">
          <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--intro-text)" }}>Why Choose Us</div>
          <div className="intro-divider" />
          <div className="intro-grid3">
            <div className="intro-card">
              <div className="intro-card-head">
                <i className="bi bi-shield-check" />
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--intro-text)" }}>Secure & Reliable</div>
              </div>
              <div className="intro-card-body">
                <div style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--intro-text)" }}>Bank-level encryption protects your financial data.</div>
                <div style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--intro-text)" }}>Our platform is trusted by thousands of users with zero security breaches.</div>
              </div>
            </div>
            <div className="intro-card">
              <div className="intro-card-head">
                <i className="bi bi-lightning-fill" />
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--intro-text)" }}>Fast & Easy</div>
              </div>
              <div className="intro-card-body">
                <div style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--intro-text)" }}>Set up your wallet in seconds.</div>
                <div style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--intro-text)" }}>Send and receive money instantly with just a few clicks.</div>
              </div>
            </div>
            <div className="intro-card">
              <div className="intro-card-head">
                <i className="bi bi-graph-up" />
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--intro-text)" }}>Smart Analytics</div>
              </div>
              <div className="intro-card-body">
                <div style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--intro-text)" }}>Track your spending patterns and get insights.</div>
                <div style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--intro-text)" }}>Make informed decisions with our detailed reports.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="intro-section">
          <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--intro-text)" }}>What Our Users Say</div>
          <div className="intro-divider" />
          <div className="intro-reviews">
            <div className="intro-review">
              <div className="intro-review-top">
                <div style={{ width: "38px", height: "38px", borderRadius: "999px", background: "#e7e9f2", display: "grid", placeItems: "center", fontSize: "14px", fontWeight: 600, color: "var(--intro-text)" }}>SJ</div>
                <div className="intro-review-meta">
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--intro-text)" }}>Sarah Johnson</div>
                  <div style={{ fontSize: "13px", color: "#ffc046" }}>★★★★★ 5/5</div>
                </div>
              </div>
              <div className="intro-review-body">
                <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--intro-text)" }}>This wallet app has completely changed how I manage my finances. The interface is intuitive and analytics give me clarity on spending habits.</div>
              </div>
            </div>
            <div className="intro-review">
              <div className="intro-review-top">
                <div style={{ width: "38px", height: "38px", borderRadius: "999px", background: "#e7e9f2", display: "grid", placeItems: "center", fontSize: "14px", fontWeight: 600, color: "var(--intro-text)" }}>MC</div>
                <div className="intro-review-meta">
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--intro-text)" }}>Michael Chen</div>
                  <div style={{ fontSize: "13px", color: "#ffc046" }}>★★★★★ 5/5</div>
                </div>
              </div>
              <div className="intro-review-body">
                <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--intro-text)" }}>Fast, secure, and reliable platform. I've been using it for 6 months. Never had any issues and customer support team is fantastic and responsive.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="intro-section intro-actions">
          <div className="intro-ctaRow">
            <button
              type="button"
              className="intro-btn cta"
              onClick={() => navigate("/register")}
            >
              Get started
            </button>
            <button
              type="button"
              className="intro-btn secondary"
              onClick={() => navigate("/login")}
            >
              Already have an account?
            </button>
          </div>
        </div>
      </div>

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