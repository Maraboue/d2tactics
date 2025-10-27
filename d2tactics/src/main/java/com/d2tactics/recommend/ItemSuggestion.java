// com/d2tactics/d2tactics/recommend/ItemSuggestion.java
package com.d2tactics.recommend;

import java.util.LinkedHashSet;
import java.util.Set;

public class ItemSuggestion {
    private String name;
    private Set<String> reasons = new LinkedHashSet<>();
    private Set<String> fromThreats = new LinkedHashSet<>();
    private int score;

    public ItemSuggestion(String name) { this.name = name; }

    public String getName() { return name; }
    public Set<String> getReasons() { return reasons; }
    public Set<String> getFromThreats() { return fromThreats; }
    public int getScore() { return score; }

    public ItemSuggestion addReason(String r) { if (r != null && !r.isBlank()) reasons.add(r); return this; }
    public ItemSuggestion addThreat(String t) { if (t != null && !t.isBlank()) fromThreats.add(t); return this; }
    public ItemSuggestion score(int s) { this.score = s; return this; }
}
