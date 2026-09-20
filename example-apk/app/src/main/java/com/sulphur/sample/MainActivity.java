package com.sulphur.sample;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.animation.OvershootInterpolator;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private LinearLayout content;
    private int cartCount = 0;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        showHome();
    }

    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size) {
        TextView view = new TextView(this);
        view.setText(value); view.setTextSize(size); view.setTextColor(Color.rgb(17, 24, 39));
        view.setPadding(0, dp(6), 0, dp(6)); return view;
    }
    private Button action(String value, View.OnClickListener listener) {
        Button button = new Button(this); button.setText(value); button.setAllCaps(false); button.setTextColor(Color.WHITE);
        button.setTextSize(16); button.setBackgroundResource(com.sulphur.sample.R.drawable.primary_button);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2); params.setMargins(0, dp(8), 0, dp(8));
        button.setLayoutParams(params); button.setOnClickListener(listener); return button;
    }
    private void page(String title, String subtitle) {
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true);
        content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(dp(24), dp(30), dp(24), dp(30));
        content.setBackgroundColor(getColor(R.color.paper)); scroll.addView(content); setContentView(scroll);
        TextView brand = text("SULPHUR · SAMPLE SHOP", 13); brand.setTextColor(getColor(R.color.violet)); content.addView(brand);
        TextView heading = text(title, 30); heading.setPadding(0, dp(12), 0, 0); content.addView(heading);
        content.addView(text(subtitle, 16));
        content.setAlpha(0f); content.setTranslationY(dp(20));
        content.animate().alpha(1f).translationY(0).setDuration(320).setInterpolator(new OvershootInterpolator(.75f)).start();
    }
    private void card(String label, String detail, View.OnClickListener listener) {
        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL); card.setBackgroundResource(R.drawable.card);
        card.setClickable(true); card.setOnClickListener(listener); card.setPadding(dp(18), dp(14), dp(18), dp(14));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2); params.setMargins(0, dp(10), 0, dp(2)); card.setLayoutParams(params);
        card.addView(text(label, 19)); card.addView(text(detail, 14)); content.addView(card);
        card.setOnLongClickListener(v -> { ObjectAnimator.ofFloat(v, View.ROTATION, 0f, 1.5f, 0f).setDuration(260).start(); return true; });
    }
    private void showHome() {
        page("Make everyday brighter.", "A five-screen shopping journey for testing your Android agents.");
        card("Nimbus Headphones", "$79 · spatial sound", v -> showProduct("Nimbus Headphones", "$79", "Matte violet"));
        card("Orbit Lamp", "$42 · warm glow", v -> showProduct("Orbit Lamp", "$42", "Cloud white"));
        content.addView(action("Browse collection", v -> showCatalog()));
        content.addView(action("Cart (" + cartCount + ")", v -> showCart()));
    }
    private void showCatalog() {
        page("The collection", "Tap an item to view its details.");
        card("Nimbus Headphones", "$79 · Ready to ship", v -> showProduct("Nimbus Headphones", "$79", "Matte violet"));
        card("Orbit Lamp", "$42 · Ready to ship", v -> showProduct("Orbit Lamp", "$42", "Cloud white"));
        card("Canvas Tote", "$18 · Ready to ship", v -> showProduct("Canvas Tote", "$18", "Natural cotton"));
        content.addView(action("Back home", v -> showHome()));
    }
    private void showProduct(String name, String price, String variant) {
        page(name, price + " · " + variant);
        TextView art = text("✦", 90); art.setTextColor(getColor(R.color.violet)); art.setGravity(Gravity.CENTER); content.addView(art);
        content.addView(text("Designed for a calm desk setup. Your agent can add this item, review the cart, and place a sample order.", 16));
        content.addView(action("Add to cart", v -> { cartCount++; Toast.makeText(this, name + " added", Toast.LENGTH_SHORT).show(); showCart(); }));
        content.addView(action("Back to collection", v -> showCatalog()));
    }
    private void showCart() {
        page("Your cart", cartCount == 0 ? "Your cart is ready for an item." : cartCount + " item" + (cartCount == 1 ? "" : "s") + " ready for checkout.");
        if (cartCount == 0) content.addView(text("Browse the collection to add a sample product.", 16));
        else { card("Order summary", "Sample order · no payment is collected", v -> {}); content.addView(action("Continue to checkout", v -> showCheckout())); }
        content.addView(action("Keep shopping", v -> showCatalog()));
    }
    private void showCheckout() {
        page("Review and place", "This is a safe sample checkout—no payment details are requested.");
        card("Delivery", "Alex · 42 Aurora Lane", v -> Toast.makeText(this, "Delivery address selected", Toast.LENGTH_SHORT).show());
        card("Order total", "$" + (cartCount * 79) + ".00", v -> {});
        content.addView(action("Place sample order", v -> { cartCount = 0; showConfirmation(); }));
    }
    private void showConfirmation() {
        page("Order placed ✦", "Your sample order is confirmed. This is the fifth connected screen.");
        content.addView(action("Return home", v -> showHome()));
    }
    @Override public void onBackPressed() { showHome(); }
}
