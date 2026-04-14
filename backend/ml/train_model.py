import pandas as pd
import pickle
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

df = pd.read_csv("ml/training_data.csv")

FEATURES = [
    "zone_flood_risk", "zone_rain_freq", "is_monsoon",
    "month", "past_claims", "fraud_flag",
    "hours_per_day", "sensitivity_index"
]

X = df[FEATURES]
y = df["premium_multiplier"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = XGBRegressor(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
print(f"MAE on test set: {mae:.4f}")

with open("ml/model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model saved → ml/model.pkl")