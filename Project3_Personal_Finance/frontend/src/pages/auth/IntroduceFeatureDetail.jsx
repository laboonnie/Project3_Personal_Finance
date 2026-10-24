import React from "react";
import "./IntroduceFeatureDetail.css";
import debtImg from "../../images/debts.png";
import budgetImg from "../../images/budgets.png";
import analyticsImg from "../../images/dashboard.png";

export const FEATURES = {
  "1": {
    title: "Debt Management",
    imageAlt: "Debt Management feature illustration",
    imageUrl: debtImg,
    description: "Track and manage all your debts in one place. Monitor outstanding balances, interest rates, and due dates with real-time updates.",
    keyFeatures: [
      "Add multiple debts from different sources",
      "Track payment progress with visual indicators",
      "Set reminders for upcoming payment due dates",
      "Calculate total interest and remaining balance",
      "Make payments directly from the app"
    ]
  },
  "2": {
    title: "Budget Tracking",
    imageAlt: "Budget Tracking feature illustration",
    imageUrl: budgetImg,
    description: "Set spending limits and monitor your budget across different categories. Get alerts when you're approaching or exceeding your limits.",
    keyFeatures: [
      "Create custom budget categories",
      "Set monthly spending limits per category",
      "Real-time spending tracking",
      "Visual progress indicators for each category",
      "Receive notifications when approaching limits"
    ]
  },
  "3": {
    title: "Expense Analytics",
    imageAlt: "Expense Analytics feature illustration",
    imageUrl: analyticsImg,
    description: "Gain deep insights into your spending habits with advanced analytics and detailed reports. Understand where your money goes.",
    keyFeatures: [
      "View detailed spending breakdown by category",
      "Monthly and yearly expense reports",
      "Identify spending patterns and trends",
      "Compare spending across different periods",
      "Export reports for financial planning"
    ]
  },
};

export function IntroduceFeaturePanel({ id, onClose }) {
  const meta = FEATURES[id] ?? FEATURES["1"];

  return (
    <div className="ifd-frame">
      <div className="ifd-top">
        <h1 id="intro-feature-dialog-title" className="ifd-title">
          {meta.title}
        </h1>
        <button
          type="button"
          className="ifd-back"
          onClick={onClose}
          aria-label="Close"
        >
          <i className="bi bi-x-lg" aria-hidden="true" /> Close
        </button>
      </div>

      <div className="ifd-image-wrap">
        <img
          className="ifd-image"
          src={meta.imageUrl}
          alt={meta.imageAlt}
        />
      </div>

      <div className="ifd-body">
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#64748b", marginBottom: "20px" }}>
          {meta.description}
        </p>

        <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginBottom: "14px" }}>
          Key Highlights
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {meta.keyFeatures.map((feature, idx) => (
            <div key={idx} className="ifd-feature-item">
              <span className="ifd-feature-check">✓</span>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}