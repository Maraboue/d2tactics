// com/d2tactics/d2tactics/recommend/RulesModel.java
package com.d2tactics.recommend;

import java.util.List;
import java.util.Map;

public class RulesModel {
    private Map<String, Threat> threats;
    private Map<String, List<String>> hero_tags;

    public Map<String, Threat> getThreats() { return threats; }
    public void setThreats(Map<String, Threat> threats) { this.threats = threats; }
    public Map<String, List<String>> getHero_tags() { return hero_tags; }
    public void setHero_tags(Map<String, List<String>> hero_tags) { this.hero_tags = hero_tags; }

    public static class Threat {
        private List<ThreatItem> items;
        public List<ThreatItem> getItems() { return items; }
        public void setItems(List<ThreatItem> items) { this.items = items; }
    }

    public static class ThreatItem {
        private String name;
        private String reason;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
