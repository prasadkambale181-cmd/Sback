const categoryKeywords = {
    Road: ['pothole', 'road', 'street', 'pavement', 'crack', 'highway', 'footpath', 'sidewalk', 'traffic', 'signal', 'divider', 'speed breaker', 'manhole'],
    Garbage: ['garbage', 'waste', 'trash', 'litter', 'dump', 'rubbish', 'dirty', 'filth', 'stink', 'smell', 'bin', 'collection', 'sweeping'],
    Water: ['water', 'pipe', 'leak', 'flood', 'drainage', 'sewage', 'overflow', 'supply', 'tap', 'bore', 'contamination', 'no water'],
    Electricity: ['electricity', 'power', 'light', 'streetlight', 'wire', 'pole', 'transformer', 'outage', 'blackout', 'electric', 'voltage', 'sparking'],
    Sewage: ['sewer', 'sewage', 'drain', 'blocked drain', 'stench', 'wastewater'],
    Parks: ['park', 'garden', 'tree', 'bench', 'playground', 'grass', 'green', 'plant'],
    Noise: ['noise', 'loud', 'sound', 'music', 'construction', 'disturbance', 'nuisance', 'horn'],
    Other: [],
};

const priorityKeywords = {
    Critical: ['emergency', 'urgent', 'danger', 'hazard', 'accident', 'injury', 'death', 'fire', 'explosion', 'collapse', 'flood', 'sparking', 'electrocution', 'contamination'],
    High: ['major', 'serious', 'severe', 'broken', 'blocked', 'no water', 'no electricity', 'blackout', 'overflow', 'leak', 'pothole', 'large'],
    Medium: ['moderate', 'issue', 'problem', 'repair', 'fix', 'maintenance', 'dirty', 'garbage'],
    Low: ['minor', 'small', 'little', 'slight', 'cosmetic', 'suggestion', 'request'],
};

export const SLA_HOURS = {
    Electricity: 6,
    Water: 12,
    Sewage: 12,
    Road: 48,
    Garbage: 24,
    Parks: 72,
    Noise: 24,
    Other: 48,
};

export const classifyIssue = (title, description) => {
    const text = `${title} ${description}`.toLowerCase();
    const scores = {};

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        scores[category] = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword)) scores[category] += keyword.split(' ').length;
        }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = total > 0 ? Math.min(Math.round((best[1] / total) * 100), 95) : 30;

    const foundKeywords = [];
    for (const keywords of Object.values(categoryKeywords)) {
        for (const kw of keywords) {
            if (text.includes(kw) && !foundKeywords.includes(kw)) foundKeywords.push(kw);
        }
    }

    return {
        category: best[1] > 0 ? best[0] : 'Other',
        confidence: best[1] > 0 ? confidence : 30,
        keywords: foundKeywords.slice(0, 5),
    };
};

export const detectPriority = (title, description, category, upvoteCount = 0) => {
    const text = `${title} ${description}`.toLowerCase();

    for (const [priority, keywords] of Object.entries(priorityKeywords)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                if (upvoteCount >= 50) return 'Critical';
                if (upvoteCount >= 20 && priority === 'Medium') return 'High';
                return priority;
            }
        }
    }

    const categoryDefaults = {
        Electricity: 'High', Water: 'High', Sewage: 'High',
        Road: 'Medium', Garbage: 'Medium', Parks: 'Low', Noise: 'Low', Other: 'Medium',
    };

    let base = categoryDefaults[category] || 'Medium';
    if (upvoteCount >= 50) base = 'Critical';
    else if (upvoteCount >= 20 && base === 'Medium') base = 'High';
    else if (upvoteCount >= 10 && base === 'Low') base = 'Medium';
    return base;
};

export const getSLADeadline = (category) => {
    const hours = SLA_HOURS[category] || 48;
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return { deadline, hoursAllowed: hours };
};

export const checkSLAStatus = (issue) => {
    if (!issue.sla?.deadline || issue.status === 'Resolved') return null;
    const now = new Date();
    const deadline = new Date(issue.sla.deadline);
    const diffMs = now - deadline;
    if (diffMs > 0) {
        return { isOverdue: true, delayHours: Math.round(diffMs / (1000 * 60 * 60)) };
    }
    return { isOverdue: false, delayHours: 0 };
};

export const generateAIDescription = (userInput) => {
    const classification = classifyIssue(userInput, '');
    const priority = detectPriority(userInput, '', classification.category);
    const firstSentence = userInput.split(/[.!?]/)[0].trim();
    const suggestedTitle = firstSentence.length > 10 && firstSentence.length < 80
        ? firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
        : `${classification.category} Issue Reported`;

    return { category: classification.category, priority, suggestedTitle, suggestedDescription: userInput.trim(), confidence: classification.confidence };
};

const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const cosineSimilarity = (str1, str2) => {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const allWords = [...new Set([...words1, ...words2])];
    const vec1 = allWords.map(w => words1.filter(x => x === w).length);
    const vec2 = allWords.map(w => words2.filter(x => x === w).length);
    const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
    return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
};

export const findDuplicates = async (Issue, title, description, lat, lng) => {
    const titleWords = title.toLowerCase().split(' ').filter(w => w.length > 3);
    const textQuery = titleWords.length > 0
        ? { title: { $regex: titleWords.slice(0, 3).join('|'), $options: 'i' } }
        : {};

    const candidates = await Issue.find({
        ...textQuery,
        status: { $ne: 'Resolved' },
        isDuplicate: false,
    }).select('_id title description location category status upvoteCount createdAt').limit(20);

    const duplicates = [];
    for (const candidate of candidates) {
        let score = 0;
        if (lat && lng && candidate.location?.lat && candidate.location?.lng) {
            const dist = haversineDistance(lat, lng, candidate.location.lat, candidate.location.lng);
            if (dist < 0.5) score += 50;
            else if (dist < 1) score += 20;
        }
        score += cosineSimilarity(title.toLowerCase(), candidate.title.toLowerCase()) * 40;
        if (score >= 30) duplicates.push({ issue: candidate, score: Math.round(score) });
    }

    return duplicates.sort((a, b) => b.score - a.score).slice(0, 3);
};
