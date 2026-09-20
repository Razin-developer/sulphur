package com.sulphur.sample;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

/** A deliberately varied, polished interaction surface for Sulphur demos. */
public final class MainActivity extends Activity {
    private LinearLayout content;
    private int cartCount = 0;
    private int quantity = 1;
    private int accent;
    private int ink;
    private int muted;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        accent = getColor(R.color.accent);
        ink = getColor(R.color.ink);
        muted = getColor(R.color.muted);
        showHome();
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private LinearLayout.LayoutParams full(int top, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, dp(top), 0, dp(bottom));
        return params;
    }
    private TextView label(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value); view.setTextSize(size); view.setTextColor(color);
        view.setPadding(0, dp(4), 0, dp(4));
        return view;
    }
    private TextView eyebrow(String value) {
        TextView view = label(value.toUpperCase(), 12, accent);
        view.setLetterSpacing(.11f); return view;
    }
    private Button button(String value, boolean primary, View.OnClickListener listener) {
        Button view = new Button(this);
        view.setText(value); view.setTextSize(15); view.setAllCaps(false);
        view.setTextColor(primary ? Color.WHITE : ink);
        view.setBackgroundResource(primary ? R.drawable.primary_button : R.drawable.secondary_button);
        view.setPadding(dp(16), 0, dp(16), 0); view.setMinHeight(dp(50));
        view.setLayoutParams(full(8, 2)); view.setOnClickListener(listener); return view;
    }
    private Button compactButton(String value, View.OnClickListener listener) {
        Button view = new Button(this); view.setText(value); view.setAllCaps(false); view.setTextSize(13);
        view.setTextColor(ink); view.setBackgroundResource(R.drawable.chip_button); view.setOnClickListener(listener);
        view.setPadding(dp(12), 0, dp(12), 0); return view;
    }
    private void addDivider() {
        View divider = new View(this); divider.setBackgroundColor(getColor(R.color.line));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(1));
        params.setMargins(0, dp(14), 0, dp(14)); content.addView(divider, params);
    }
    private void page(String section, String title, String subtitle) {
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setClipToPadding(false);
        content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(22), dp(26), dp(22), dp(34)); content.setBackgroundColor(getColor(R.color.canvas));
        scroll.addView(content); setContentView(scroll);
        TextView brand = label("NOVA", 15, ink); brand.setLetterSpacing(.08f); content.addView(brand);
        content.addView(eyebrow(section));
        TextView heading = label(title, 31, ink); heading.setPadding(0, dp(8), 0, 0); content.addView(heading);
        content.addView(label(subtitle, 16, muted));
    }
    private LinearLayout card(String title, String detail, View.OnClickListener listener) {
        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(18), dp(16), dp(18), dp(16)); card.setBackgroundResource(R.drawable.card);
        card.setClickable(true); card.setFocusable(true); card.setOnClickListener(listener); card.setLayoutParams(full(12, 0));
        card.addView(label(title, 19, ink)); card.addView(label(detail, 14, muted)); content.addView(card); return card;
    }
    private EditText input(String hint, boolean multiline) {
        EditText field = new EditText(this); field.setHint(hint); field.setTextSize(16); field.setTextColor(ink);
        field.setHintTextColor(getColor(R.color.placeholder)); field.setBackgroundResource(R.drawable.input_field);
        field.setPadding(dp(14), dp(10), dp(14), dp(10)); field.setSingleLine(!multiline);
        if (multiline) { field.setMinLines(3); field.setGravity(Gravity.TOP); }
        field.setLayoutParams(full(8, 4)); content.addView(field); return field;
    }
    private void showHome() {
        page("CoTester interaction playground", "Make testing feel real.", "A rich mobile storefront with intentional test surfaces.");
        LinearLayout hero = card("Today’s mission", "Build a desk set-up, customize it, and complete the mock checkout.", v -> showCatalog());
        TextView badge = label("4 screens · 20+ controls · no real payments", 12, accent);
        badge.setBackgroundResource(R.drawable.chip_button); badge.setPadding(dp(10), dp(6), dp(10), dp(6)); hero.addView(badge);
        content.addView(button("Explore products", true, v -> showCatalog()));
        content.addView(button("Open interaction lab", false, v -> showInteractionLab()));
        content.addView(button("Profile & preferences", false, v -> showProfile()));
        addDivider(); content.addView(eyebrow("Quick actions"));
        LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL); row.setOrientation(LinearLayout.HORIZONTAL);
        Button saved = compactButton("Saved list", v -> Toast.makeText(this, "3 saved products", Toast.LENGTH_SHORT).show());
        Button cart = compactButton("Cart · " + cartCount, v -> showCart());
        LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0, -2, 1f); left.setMargins(0, dp(8), dp(6), 0);
        LinearLayout.LayoutParams right = new LinearLayout.LayoutParams(0, -2, 1f); right.setMargins(dp(6), dp(8), 0, 0);
        row.addView(saved, left); row.addView(cart, right); content.addView(row);
        content.addView(label("Tip: scroll this page and use the cards, compact controls, and primary actions independently.", 13, muted));
    }
    private void showCatalog() {
        page("Products", "Find your focus.", "Tap a product card or use the Add button without opening details.");
        catalogCard("Nimbus headphones", "$79 · Immersive sound", "Audio", v -> showProduct("Nimbus headphones", "$79", "Matte violet"));
        catalogCard("Orbit lamp", "$42 · Warm light", "Lighting", v -> showProduct("Orbit lamp", "$42", "Cloud white"));
        catalogCard("Canvas tote", "$18 · Everyday carry", "Accessories", v -> showProduct("Canvas tote", "$18", "Natural canvas"));
        catalogCard("Arc desk clock", "$34 · Quiet focus", "Workspace", v -> showProduct("Arc desk clock", "$34", "Graphite"));
        content.addView(button("View cart · " + cartCount, false, v -> showCart()));
    }
    private void catalogCard(String name, String detail, String category, View.OnClickListener open) {
        LinearLayout item = card(name, category + " · " + detail, open);
        LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL);
        Button details = compactButton("Details", open);
        Button add = compactButton("Add", v -> { cartCount++; Toast.makeText(this, name + " added to cart", Toast.LENGTH_SHORT).show(); });
        LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0, -2, 1f); left.setMargins(0, dp(8), dp(6), 0);
        LinearLayout.LayoutParams right = new LinearLayout.LayoutParams(0, -2, 1f); right.setMargins(dp(6), dp(8), 0, 0);
        row.addView(details, left); row.addView(add, right); item.addView(row);
    }
    private void showProduct(String name, String price, String color) {
        quantity = 1;
        page("Product details", name, price + " · " + color);
        TextView art = label("✦", 90, accent); art.setGravity(Gravity.CENTER); art.setPadding(0, dp(4), 0, dp(4)); content.addView(art);
        content.addView(label("A carefully designed object for calm, focused work. Select your configuration below.", 16, muted));
        content.addView(eyebrow("Choose a finish"));
        RadioGroup finishes = new RadioGroup(this); finishes.setOrientation(LinearLayout.HORIZONTAL); finishes.setLayoutParams(full(6, 4));
        for (String finish : new String[]{"Violet", "Cloud", "Ink"}) { RadioButton option = new RadioButton(this); option.setText(finish); option.setTextColor(ink); option.setTextSize(14); finishes.addView(option); }
        ((RadioButton) finishes.getChildAt(0)).setChecked(true); content.addView(finishes);
        content.addView(eyebrow("Quantity"));
        LinearLayout quantityRow = new LinearLayout(this); quantityRow.setGravity(Gravity.CENTER_VERTICAL);
        Button minus = compactButton("−", v -> { if (quantity > 1) quantity--; showProduct(name, price, color); });
        TextView count = label(String.valueOf(quantity), 18, ink); count.setGravity(Gravity.CENTER);
        Button plus = compactButton("+", v -> { quantity++; showProduct(name, price, color); });
        quantityRow.addView(minus, new LinearLayout.LayoutParams(0, -2, 1f)); quantityRow.addView(count, new LinearLayout.LayoutParams(0, -2, 1f)); quantityRow.addView(plus, new LinearLayout.LayoutParams(0, -2, 1f)); content.addView(quantityRow);
        CheckBox gift = new CheckBox(this); gift.setText("Add a gift note"); gift.setTextColor(ink); gift.setLayoutParams(full(8, 2)); content.addView(gift);
        content.addView(button("Add " + quantity + " to cart", true, v -> { cartCount += quantity; Toast.makeText(this, name + " added", Toast.LENGTH_SHORT).show(); showCart(); }));
        content.addView(button("Back to collection", false, v -> showCatalog()));
    }
    private void showCart() {
        page("Your cart", cartCount == 0 ? "It’s quiet here." : cartCount + " item" + (cartCount == 1 ? "" : "s") + " ready to go.", "Everything below is a mock flow for safe agent testing.");
        if (cartCount == 0) content.addView(card("Nothing selected yet", "Browse the collection and use an Add action.", v -> showCatalog()));
        else {
            card("Desk set-up", cartCount + " item" + (cartCount == 1 ? "" : "s") + " · Ready to ship", v -> {});
            Switch express = new Switch(this); express.setText("Priority dispatch"); express.setTextColor(ink); express.setLayoutParams(full(8, 2)); content.addView(express);
            content.addView(button("Continue to checkout", true, v -> showCheckout()));
        }
        content.addView(button("Keep shopping", false, v -> showCatalog()));
    }
    private void showCheckout() {
        page("Mock checkout", "A few final details.", "No information is sent anywhere—this is strictly a visual test flow.");
        input("Full name", false); input("Email address", false).setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS); input("Delivery note (optional)", true);
        content.addView(eyebrow("Delivery window"));
        Spinner window = new Spinner(this); String[] options = {"Choose a window", "Morning · 9–12", "Afternoon · 12–5", "Evening · 5–8"};
        window.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, options)); window.setLayoutParams(full(6, 6)); content.addView(window);
        CheckBox policy = new CheckBox(this); policy.setText("I understand this is a sample order"); policy.setTextColor(ink); policy.setLayoutParams(full(6, 4)); content.addView(policy);
        content.addView(button("Place sample order", true, v -> { if (!policy.isChecked()) { Toast.makeText(this, "Please acknowledge the sample order", Toast.LENGTH_SHORT).show(); return; } cartCount = 0; showConfirmation(); }));
    }
    private void showConfirmation() {
        page("Order placed", "You did it ✦", "The mock receipt is ready. This marks the end of the commerce journey.");
        card("Receipt #NOVA-2048", "Sample order confirmed · $79.00", v -> Toast.makeText(this, "Receipt copied", Toast.LENGTH_SHORT).show());
        content.addView(button("Return home", true, v -> showHome())); content.addView(button("Try interaction lab", false, v -> showInteractionLab()));
    }
    private void showProfile() {
        page("Profile", "Make it yours.", "Typing, selection, switches, and a safe save action all live here.");
        input("Your name", false); input("Workspace email", false).setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        content.addView(eyebrow("Notification preferences"));
        Switch updates = new Switch(this); updates.setText("Product updates"); updates.setTextColor(ink); updates.setChecked(true); content.addView(updates, full(6, 2));
        Switch reminders = new Switch(this); reminders.setText("Gentle daily reminder"); reminders.setTextColor(ink); content.addView(reminders, full(2, 2));
        content.addView(button("Save preferences", true, v -> Toast.makeText(this, "Preferences saved", Toast.LENGTH_SHORT).show())); content.addView(button("Back home", false, v -> showHome()));
    }
    private void showInteractionLab() {
        page("Interaction lab", "Every control, one screen.", "Use this page to verify taps, long scrolling, dialogs, toggles, ranges, and selection groups.");
        content.addView(eyebrow("Segmentation")); RadioGroup modes = new RadioGroup(this); modes.setOrientation(LinearLayout.HORIZONTAL);
        for (String mode : new String[]{"Focus", "Flow", "Break"}) { RadioButton option = new RadioButton(this); option.setText(mode); option.setTextColor(ink); modes.addView(option); }
        ((RadioButton) modes.getChildAt(0)).setChecked(true); content.addView(modes);
        content.addView(eyebrow("Intensity")); SeekBar intensity = new SeekBar(this); intensity.setMax(10); intensity.setProgress(6); intensity.setContentDescription("Test intensity"); content.addView(intensity, full(4, 2));
        ProgressBar progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal); progress.setProgress(68); progress.setMax(100); progress.setContentDescription("Profile completeness 68 percent"); content.addView(progress, full(2, 6));
        Switch experimental = new Switch(this); experimental.setText("Enable experimental motion"); experimental.setTextColor(ink); content.addView(experimental, full(2, 2));
        CheckBox checklist = new CheckBox(this); checklist.setText("Mark this scenario complete"); checklist.setTextColor(ink); content.addView(checklist, full(2, 4));
        content.addView(button("Open confirmation dialog", true, v -> new AlertDialog.Builder(this).setTitle("Run the sample action?").setMessage("This dialog lets an agent choose Cancel or Continue.").setNegativeButton("Cancel", null).setPositiveButton("Continue", (d, which) -> Toast.makeText(this, "Sample action complete", Toast.LENGTH_SHORT).show()).show()));
        content.addView(eyebrow("Horizontal chips")); HorizontalScrollView horizontal = new HorizontalScrollView(this); LinearLayout chips = new LinearLayout(this); chips.setPadding(0, dp(6), 0, dp(6));
        for (String filter : new String[]{"Featured", "Audio", "Lighting", "Desk", "Travel", "New"}) { Button chip = compactButton(filter, v -> Toast.makeText(this, filter + " filter selected", Toast.LENGTH_SHORT).show()); LinearLayout.LayoutParams chipParams = new LinearLayout.LayoutParams(dp(100), -2); chipParams.setMargins(0, 0, dp(8), 0); chips.addView(chip, chipParams); }
        horizontal.addView(chips); content.addView(horizontal, full(2, 8)); content.addView(eyebrow("Long scroll section"));
        for (int index = 1; index <= 9; index++) content.addView(card("Checkpoint " + index, "Tap this card after scrolling to verify long-page navigation.", v -> Toast.makeText(this, "Checkpoint reached", Toast.LENGTH_SHORT).show()));
        content.addView(button("Return home", false, v -> showHome()));
    }
    @Override public void onBackPressed() { showHome(); }
}
