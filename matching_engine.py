#!/usr/bin/env python3
import os
import sqlite3
import re

# Resolve database path relative to backend directory
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'dev.db')

def get_connection():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at: {DB_PATH}. Please run backend/seed system first.")
    return sqlite3.connect(DB_PATH)

def clean_location(loc_str):
    if not loc_str:
        return []
    return [l.strip().lower() for l in re.split(r'[,\s]+', loc_str) if l.strip()]

def calculate_match_score(property, requirement):
    """
    Computes a matching score between a property and a client requirement.
    Returns: (score_percentage, reasons_list)
    """
    prop_type, prop_subtype, prop_bedrooms, prop_price, prop_location, prop_area, prop_area_unit = property
    req_type, req_bedrooms, req_budget_min, req_budget_max, req_locations, req_prop_type = requirement
    
    score = 0
    weights = {
        'type': 30,       # Buy vs Rent consistency
        'prop_type': 25,  # Apartment vs Villa vs Bungalow etc.
        'config': 15,     # BHK/Bedrooms or square yards/area
        'budget': 20,     # Price range check
        'location': 10    # Target locations matched
    }
    
    reasons = []
    
    # 1. Transaction Type Consistency (Buy/Rent vs Sell/Rent)
    is_type_match = False
    r_type = req_type.lower().strip()
    p_type = prop_type.lower().strip()
    if r_type == p_type:
        is_type_match = True
    elif r_type == "buy" and p_type == "sell":
        is_type_match = True
    elif r_type == "sell" and p_type == "buy":
        is_type_match = True
        
    if is_type_match:
        score += weights['type']
    else:
        reasons.append("Deal model mismatch (Buy vs Rent)")
        
    # 2. Property Type Match
    req_p_type = req_prop_type.lower().strip() if req_prop_type else ""
    prop_p_type = prop_subtype.lower().strip() if prop_subtype else ""
    
    synonyms = {
        "villa": ["villa", "bungalow", "house", "independent house"],
        "bungalow": ["villa", "bungalow", "house", "independent house"],
        "apartment": ["apartment", "flat", "tenement"],
        "office": ["office", "office space", "commercial", "shop"],
        "land": ["land", "plot", "square yards"]
    }
    
    type_score = 0
    if req_p_type == prop_p_type:
        type_score = 1.0
    elif req_p_type in synonyms and prop_p_type in synonyms[req_p_type]:
        type_score = 0.8  # Synonymous type
        reasons.append(f"Similar type match ({prop_p_type.capitalize()} vs {req_p_type.capitalize()})")
    else:
        reasons.append(f"Property type mismatch ({prop_p_type.capitalize()} vs {req_p_type.capitalize()})")
        
    score += type_score * weights['prop_type']
    
    # 3. Configuration (Bedrooms / BHK) Match
    if req_p_type in ["office", "land"]:
        score += weights['config']
    else:
        if req_bedrooms == prop_bedrooms:
            score += weights['config']
        elif abs(req_bedrooms - prop_bedrooms) == 1:
            score += weights['config'] * 0.6
            reasons.append(f"BHK off by 1 ({prop_bedrooms} vs client wanting {req_bedrooms})")
        else:
            reasons.append(f"BHK mismatch ({prop_bedrooms} vs client wanting {req_bedrooms})")
            
    # 4. Budget Match
    if req_budget_min <= prop_price <= req_budget_max:
        score += weights['budget']
    elif prop_price < req_budget_min:
        diff_pct = (req_budget_min - prop_price) / req_budget_min
        if diff_pct < 0.25:
            score += weights['budget'] * 0.9
            reasons.append(f"Price is slightly under budget ({prop_price:,.0f} INR)")
        else:
            score += weights['budget'] * 0.5
            reasons.append(f"Price is significantly under budget ({prop_price:,.0f} INR)")
    else:
        over_budget = prop_price - req_budget_max
        excess_pct = over_budget / req_budget_max
        if excess_pct <= 0.15:
            score += weights['budget'] * (1 - (excess_pct / 0.15) * 0.6)
            reasons.append(f"Price slightly over budget (+{excess_pct*100:.1f}%)")
        else:
            reasons.append(f"Price out of budget ({prop_price:,.0f} INR vs max {req_budget_max:,.0f} INR)")

    # 5. Location Match
    prop_loc_clean = prop_location.strip().lower()
    req_locs_clean = clean_location(req_locations)
    
    loc_matched = False
    for req_loc in req_locs_clean:
        if req_loc in prop_loc_clean or prop_loc_clean in req_loc:
            loc_matched = True
            break
            
    if loc_matched:
        score += weights['location']
    else:
        reasons.append(f"Location mismatch ({prop_location} vs desired {req_locations})")
        
    final_score = round(score)
    return final_score, reasons

def print_table(headers, rows):
    """Prints a beautiful formatted console table"""
    col_widths = [len(h) for h in headers]
    for row in rows:
        for idx, val in enumerate(row):
            col_widths[idx] = max(col_widths[idx], len(str(val)))
            
    border = "+" + "+".join(["-" * (w + 2) for w in col_widths]) + "+"
    print(border)
    
    header_str = "|" + "|".join([f" {headers[i].ljust(col_widths[i])} " for i in range(len(headers))]) + "|"
    print(header_str)
    print(border)
    
    for row in rows:
        row_str = "|" + "|".join([f" {str(row[i]).ljust(col_widths[i])} " for i in range(len(row))]) + "|"
        print(row_str)
        
    print(border)

def show_property_matches(selected_property_id=None):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        if selected_property_id:
            cursor.execute("SELECT id, title, type, propertyType, bedrooms, price, location, area, areaUnit FROM Property WHERE id = ?", (selected_property_id,))
        else:
            cursor.execute("SELECT id, title, type, propertyType, bedrooms, price, location, area, areaUnit FROM Property")
            
        properties = cursor.fetchall()
        
        if not properties:
            print("❌ No matching property records found.")
            return
            
        cursor.execute("""
            SELECT c.id, c.name, c.phone, c.email, r.type, r.bedrooms, r.budgetMin, r.budgetMax, r.locations, r.propertyType, c.intentScore
            FROM Contact c
            JOIN Requirement r ON c.id = r.contactId
        """)
        requirements = cursor.fetchall()
        
        for prop in properties:
            prop_id, title, prop_type, prop_subtype, prop_bedrooms, price, location, area, area_unit = prop
            
            print(f"\n==========================================================================")
            print(f"🏠 PROPERTY: {title}")
            print(f"📍 Location: {location} | Type: {prop_subtype.capitalize()} ({prop_type.upper()}) | Price: {price:,.0f} INR")
            print(f"📏 Size: {area} {area_unit} | Configuration: {prop_bedrooms} BHK")
            print(f"==========================================================================")
            
            matches = []
            for req in requirements:
                req_contact_id, name, phone, email, req_type, req_bedrooms, req_budget_min, req_budget_max, req_locations, req_prop_type, intent = req
                
                score, reasons = calculate_match_score(
                    (prop_type, prop_subtype, prop_bedrooms, price, location, area, area_unit),
                    (req_type, req_bedrooms, req_budget_min, req_budget_max, req_locations, req_prop_type)
                )
                
                if score >= 40:
                    match_notes = ", ".join(reasons) if reasons else "Perfect Match!"
                    if len(match_notes) > 40:
                        match_notes = match_notes[:37] + "..."
                    matches.append((name, phone, f"{score}%", f"{req_prop_type.capitalize()} / {req_bedrooms} BHK", f"{req_budget_min:,.0f}-{req_budget_max:,.0f}", match_notes))
            
            matches.sort(key=lambda x: int(x[2].replace('%', '')), reverse=True)
            
            if matches:
                headers = ["Client Name", "Contact Number", "Match Score", "Pref Type / BHK", "Budget Range (INR)", "Match Notes"]
                print_table(headers, matches)
            else:
                print("⚠️ No matching leads found for this property with >=40% compatibility score.")
                
        conn.close()
    except Exception as e:
        print("❌ Error loading matches:", e)

def interactive_lead_matcher():
    print("\n-------------------------------------------------------------")
    print("🆕 QUICK CLIENT LEAD REGISTRATION & PROPERTY MATCH ENGINE")
    print("-------------------------------------------------------------")
    name = input("Client Name: ").strip()
    phone = input("Phone Number: ").strip()
    email = input("Email Address: ").strip()
    
    print("\nSelect Requirement Deal Model:")
    print("1. Buy a Property")
    print("2. Rent a Property")
    req_choice = input("Enter choice (1/2): ").strip()
    req_type = "buy" if req_choice == "1" else "rent"
    
    print("\nSelect Property Type Preference:")
    print("1. Apartment")
    print("2. Villa")
    print("3. Bungalow")
    print("4. Office Space")
    print("5. Land/Plot")
    type_choice = input("Enter choice (1-5): ").strip()
    type_map = {"1": "apartment", "2": "villa", "3": "bungalow", "4": "office", "5": "land"}
    prop_type = type_map.get(type_choice, "apartment")
    
    bedrooms = 0
    if prop_type in ["apartment", "villa", "bungalow"]:
        try:
            bedrooms = int(input("Required Bedrooms / BHK (e.g. 2, 3, 4): "))
        except ValueError:
            bedrooms = 3
            
    try:
        budget_min = float(input("Minimum Budget (INR): "))
        budget_max = float(input("Maximum Budget (INR): "))
    except ValueError:
        budget_min = 1000000
        budget_max = 5000000
        
    locations = input("Preferred Locations (comma-separated, e.g. Bopal, Satellite): ").strip()
    
    print(f"\nSearching available listings matching {name}'s requirements...")
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, type, propertyType, bedrooms, price, location, area, areaUnit FROM Property")
        properties = cursor.fetchall()
        
        matches = []
        for prop in properties:
            prop_id, title, p_type, p_subtype, p_bedrooms, price, location, area, area_unit = prop
            
            score, reasons = calculate_match_score(
                (p_type, p_subtype, p_bedrooms, price, location, area, area_unit),
                (req_type, bedrooms, budget_min, budget_max, locations, prop_type)
            )
            
            if score >= 40:
                match_notes = ", ".join(reasons) if reasons else "Perfect Match!"
                matches.append((title, f"{p_subtype.capitalize()} / {p_bedrooms} BHK", f"{price:,.0f} INR", location, f"{score}%", match_notes))
                
        matches.sort(key=lambda x: int(x[4].replace('%', '')), reverse=True)
        
        print(f"\n⭐ PROPERTY MATCHES FOR {name.upper()}:")
        if matches:
            headers = ["Property Listing", "Type / Config", "Price", "Location", "Match Score", "Match Notes"]
            print_table(headers, matches)
        else:
            print("❌ No compatible properties match this new client's configuration.")
            
        conn.close()
    except Exception as e:
        print("❌ Error during search matching:", e)

def main():
    print("=====================================================================")
    print("🎯 PROPMATCH AI - ADVANCED CLIENT MATCHING & LEAD MATCHMAKER ENGINE")
    print("=====================================================================")
    print("Matching old leads and database contacts to property inventory...")
    
    while True:
        print("\nMain Menu Options:")
        print("1. Find Match Reports for all active Properties")
        print("2. Search Match Report for a single Property ID")
        print("3. Input a new Client Lead preference and find matches instantly")
        print("4. Exit Engine")
        choice = input("Enter choice (1-4): ").strip()
        
        if choice == "1":
            show_property_matches()
        elif choice == "2":
            try:
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id, title FROM Property")
                props = cursor.fetchall()
                print("\nAvailable Properties:")
                for p in props:
                    print(f"ID: {p[0]} | Name: {p[1]}")
                conn.close()
                
                prop_id = input("\nEnter Property ID: ").strip()
                show_property_matches(prop_id)
            except Exception as e:
                print("❌ Error:", e)
        elif choice == "3":
            interactive_lead_matcher()
        elif choice == "4":
            print("Thank you for using PropMatch AI Matching Engine. Goodbye!")
            break
        else:
            print("Invalid choice, please select 1-4.")

if __name__ == "__main__":
    main()
