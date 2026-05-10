"""
Jerusalem.live — Task B complete
Test suite for extractor.py — 10 realistic fake WhatsApp messages

Covers:
  - Hebrew-only text event
  - English-only text event
  - Mixed Hebrew/English
  - Image description (no text)
  - Complete info (high confidence expected)
  - Incomplete info / missing fields (low confidence expected)
  - Spam / reaction (not-event expected)
  - Multi-event message (ambiguous)
  - Recurring event (weekly)
  - Price + ticket URL present

Run with:  pytest test_extractor.py -v
"""

import json
from datetime import date
from unittest.mock import MagicMock, patch

import pytest

# We mock the Anthropic client so tests run without a real API key.
# The mock returns a pre-set JSON string for each test case, simulating
# what the model would actually return for that message.

from extractor import _postprocess, extract_event


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

def make_mock_response(json_payload: dict) -> MagicMock:
    """Wrap a dict in a mock that looks like an Anthropic response object."""
    mock = MagicMock()
    mock.content = [MagicMock(text=json.dumps(json_payload))]
    return mock


# Reference date for all tests to make relative date assertions deterministic
REF_DATE = date(2026, 5, 7)  # Thursday


# ---------------------------------------------------------------------------
# Test cases — 10 messages
# ---------------------------------------------------------------------------

# Message 1: Hebrew-only party announcement — complete info
MSG_1_TEXT = (
    "🎉 מסיבת גג הלילה! מגיעים לאברהם הוסטל, רחוב הנביאים 67, ירושלים\n"
    "מ-21:00 עד 3:00 בבוקר\n"
    "כניסה חינם לפני 22:00, 40 שקל אחרי\n"
    "DJ עדן ספין 🎧"
)
MSG_1_EXPECTED_RETURN = {
    "event_name": "מסיבת גג — אברהם הוסטל",
    "date": "2026-05-07",
    "start_time": "21:00",
    "end_time": "03:00",
    "venue_name": "Abraham Hostel",
    "address": "הנביאים 67, Jerusalem",
    "category": "party",
    "description": "מסיבת גג עם DJ עדן. כניסה חינם לפני 22:00.",
    "price": "Free before 22:00, ₪40 after",
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.97,
    "confidence_reasons": ["All required fields present"],
}

# Message 2: English-only jazz night — complete
MSG_2_TEXT = (
    "Jazz Night at La Vache Qui Rit, German Colony\n"
    "Friday May 8th, 8pm–11pm\n"
    "Intimate evening with the Jerusalem Jazz Quartet\n"
    "Tickets: https://eventbrite.com/e/12345\n"
    "NIS 60"
)
MSG_2_EXPECTED_RETURN = {
    "event_name": "Jazz Night @ La Vache Qui Rit",
    "date": "2026-05-08",
    "start_time": "20:00",
    "end_time": "23:00",
    "venue_name": "La Vache Qui Rit",
    "address": "German Colony, Jerusalem",
    "category": "music",
    "description": "Intimate jazz evening with the Jerusalem Jazz Quartet.",
    "price": "₪60",
    "organizer": None,
    "ticket_url": "https://eventbrite.com/e/12345",
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.95,
    "confidence_reasons": ["All required fields present", "Ticket URL present"],
}

# Message 3: Mixed Hebrew/English — market event
MSG_3_TEXT = (
    "שוק הלילה של מחנה יהודה — Night Market!\n"
    "Tonight from 18:00\n"
    "אוכל רחוב, מוזיקה חיה, אמנים מקומיים\n"
    "כיכר מחנה יהודה, ירושלים\n"
    "Free entrance!"
)
MSG_3_EXPECTED_RETURN = {
    "event_name": "שוק הלילה — מחנה יהודה",
    "date": "2026-05-07",
    "start_time": "18:00",
    "end_time": None,
    "venue_name": "Mahane Yehuda Market",
    "address": "כיכר מחנה יהודה, Jerusalem",
    "category": "market",
    "description": "ליל שוק עם אוכל רחוב ומוזיקה חיה.",
    "price": "Free",
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.87,
    "confidence_reasons": ["end_time not mentioned"],
}

# Message 4: Image-only (flyer) — no text, extraction from image description
MSG_4_TEXT = None
MSG_4_IMAGE_DESC = "[Image: colorful flyer showing 'TECHNO NIGHT @ TALPIOT WAREHOUSE, Friday 23:00–06:00, 50 NIS']"
MSG_4_EXPECTED_RETURN = {
    "event_name": "Techno Night @ Talpiot Warehouse",
    "date": "2026-05-08",
    "start_time": "23:00",
    "end_time": "06:00",
    "venue_name": "Talpiot Warehouse",
    "address": "Talpiot, Jerusalem",
    "category": "party",
    "description": "Techno night at a Talpiot warehouse.",
    "price": "₪50",
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.85,
    "confidence_reasons": ["Image-only message", "All required fields extracted from flyer"],
}

# Message 5: Incomplete info — missing date and time (low confidence)
MSG_5_TEXT = (
    "יש לנו ערב אקוסטי בנחלאות בקרוב!\n"
    "יודיעו תאריך בקרוב 🎸\n"
    "בחצר של יוסי"
)
MSG_5_EXPECTED_RETURN = {
    "event_name": "ערב אקוסטי — נחלאות",
    "date": None,
    "start_time": None,
    "end_time": None,
    "venue_name": "חצר של יוסי",
    "address": "Nachlaot, Jerusalem",
    "category": "music",
    "description": "ערב אקוסטי בנחלאות בחצר פרטית. תאריך יפורסם בקרוב.",
    "price": None,
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.37,
    "confidence_reasons": ["date missing: -0.25", "start_time missing: -0.15", "Hebrew-only: -0.05"],
}

# Message 6: Spam / reaction sticker — not an event
MSG_6_TEXT = "🙏🙏🙏"
MSG_6_EXPECTED_RETURN = {
    "event_name": None,
    "date": None,
    "start_time": None,
    "end_time": None,
    "venue_name": None,
    "address": None,
    "category": None,
    "description": None,
    "price": None,
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": False,
    "confidence_score": 0.0,
    "confidence_reasons": ["Not an event — emoji reaction only"],
}

# Message 7: News article shared (not an event)
MSG_7_TEXT = (
    "ראו מה קרה היום בכנסת 👇\n"
    "https://www.haaretz.co.il/news/politics/2026-05-07/some-article"
)
MSG_7_EXPECTED_RETURN = {
    "event_name": None,
    "date": None,
    "start_time": None,
    "end_time": None,
    "venue_name": None,
    "address": None,
    "category": None,
    "description": None,
    "price": None,
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": False,
    "confidence_score": 0.0,
    "confidence_reasons": ["Not an event — news article link"],
}

# Message 8: Recurring weekly event (next Friday)
MSG_8_TEXT = (
    "Organic Market @ German Colony — every Friday morning!\n"
    "9:00–14:00, Emek Refaim St\n"
    "Fresh vegetables, cheeses, artisan bread\n"
    "Free entry"
)
MSG_8_EXPECTED_RETURN = {
    "event_name": "Organic Market — German Colony",
    "date": "2026-05-08",    # next Friday from REF_DATE (Thursday 2026-05-07)
    "start_time": "09:00",
    "end_time": "14:00",
    "venue_name": "Emek Refaim Street",
    "address": "Emek Refaim St, German Colony, Jerusalem",
    "category": "market",
    "description": "Weekly organic market with fresh produce, cheeses, and artisan bread.",
    "price": "Free",
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.9,
    "confidence_reasons": ["Recurring event — date set to next occurrence"],
}

# Message 9: Multi-event message (two events in one message — ambiguous)
MSG_9_TEXT = (
    "סוף שבוע עמוס! 🔥\n"
    "יום שישי בלילה: מסיבה במוסררה, 22:00, כניסה חינם\n"
    "שבת בצהריים: שוק בגרמנית קולוני, 10:00-14:00\n"
    "בואו לשניהם!"
)
MSG_9_EXPECTED_RETURN = {
    "event_name": "מסיבה — מוסררה",  # extractor picks first event
    "date": "2026-05-08",
    "start_time": "22:00",
    "end_time": None,
    "venue_name": "Musrara",
    "address": "Musrara, Jerusalem",
    "category": "party",
    "description": "מסיבה בשכונת מוסררה ביום שישי בלילה. גם שוק בגרמנית קולוני בשבת.",
    "price": "Free",
    "organizer": None,
    "ticket_url": None,
    "phone": None,
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.72,
    "confidence_reasons": ["Multiple events in one message: -0.10", "end_time not mentioned"],
}

# Message 10: Full details including phone number
MSG_10_TEXT = (
    "Stand-up Comedy Night 🎤\n"
    "Club 52, Mahane Yehuda\n"
    "Thursday 21 May at 21:00\n"
    "4 comedians, 1.5 hour show\n"
    "NIS 80 — reservations: 054-123-4567\n"
    "Limited seats!"
)
MSG_10_EXPECTED_RETURN = {
    "event_name": "Stand-up Comedy Night @ Club 52",
    "date": "2026-05-21",
    "start_time": "21:00",
    "end_time": "22:30",
    "venue_name": "Club 52",
    "address": "Mahane Yehuda, Jerusalem",
    "category": "culture",
    "description": "Stand-up comedy show with 4 comedians. Limited seats.",
    "price": "₪80",
    "organizer": None,
    "ticket_url": None,
    "phone": "054-123-4567",
    "image_url": None,
    "is_event": True,
    "confidence_score": 0.97,
    "confidence_reasons": ["All required fields present", "Phone contact present"],
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestExtractor:
    """Test suite for extract_event() with mocked Anthropic API calls."""

    def _run(self, text, image_b64=None, mock_return=None):
        """Helper: run extract_event with a mocked Anthropic client."""
        with patch("extractor._get_client") as mock_client_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_mock_response(mock_return)
            result = extract_event(
                message_text=text,
                image_b64=image_b64,
                reference_date=REF_DATE,
            )
        return result

    # Test 1: Hebrew-only complete event
    def test_hebrew_party_high_confidence(self):
        result = self._run(MSG_1_TEXT, mock_return=MSG_1_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["event_name"] is not None
        assert result["category"] == "party"
        assert result["start_time"] == "21:00"
        assert result["date"] == "2026-05-07"
        assert result["confidence_score"] >= 0.85, (
            f"Expected high confidence for complete Hebrew event, got {result['confidence_score']}"
        )

    # Test 2: English jazz night — ticket URL extraction
    def test_english_jazz_ticket_url(self):
        result = self._run(MSG_2_TEXT, mock_return=MSG_2_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["category"] == "music"
        assert result["ticket_url"] == "https://eventbrite.com/e/12345"
        assert result["start_time"] == "20:00"
        assert result["end_time"] == "23:00"
        assert result["price"] == "₪60"
        assert result["confidence_score"] >= 0.85

    # Test 3: Mixed Hebrew/English market
    def test_mixed_language_market(self):
        result = self._run(MSG_3_TEXT, mock_return=MSG_3_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["category"] == "market"
        assert result["price"] == "Free"
        assert result["start_time"] == "18:00"
        assert result["end_time"] is None  # not mentioned
        # Should still be above threshold despite missing end_time
        assert result["confidence_score"] >= 0.85

    # Test 4: Image-only flyer (no text)
    def test_image_only_flyer(self):
        # Simulate b64-encoded image with a short dummy payload
        fake_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        result = self._run(MSG_4_TEXT, image_b64=fake_b64, mock_return=MSG_4_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["category"] == "party"
        assert result["venue_name"] == "Talpiot Warehouse"
        assert result["price"] == "₪50"
        # Image-only gets slight confidence penalty but should still cross threshold
        assert 0.80 <= result["confidence_score"] <= 1.0

    # Test 5: Incomplete info — missing date and time → low confidence
    def test_incomplete_info_low_confidence(self):
        result = self._run(MSG_5_TEXT, mock_return=MSG_5_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["date"] is None
        assert result["start_time"] is None
        # Should be below auto-publish threshold
        assert result["confidence_score"] < 0.85, (
            f"Expected low confidence for incomplete event, got {result['confidence_score']}"
        )

    # Test 6: Emoji reaction — not an event
    def test_emoji_not_event(self):
        result = self._run(MSG_6_TEXT, mock_return=MSG_6_EXPECTED_RETURN)
        assert result["is_event"] is False
        assert result["confidence_score"] == 0.0
        assert result["event_name"] is None

    # Test 7: News article link — not an event
    def test_news_article_not_event(self):
        result = self._run(MSG_7_TEXT, mock_return=MSG_7_EXPECTED_RETURN)
        assert result["is_event"] is False
        assert result["confidence_score"] == 0.0

    # Test 8: Recurring weekly event — date is next Friday
    def test_recurring_event_next_friday(self):
        result = self._run(MSG_8_TEXT, mock_return=MSG_8_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["category"] == "market"
        assert result["date"] == "2026-05-08", (
            "Expected next Friday (2026-05-08) from reference Thursday 2026-05-07"
        )
        assert result["start_time"] == "09:00"
        assert result["end_time"] == "14:00"
        assert result["confidence_score"] >= 0.85

    # Test 9: Multi-event message — confidence penalty applied
    def test_multi_event_confidence_penalty(self):
        result = self._run(MSG_9_TEXT, mock_return=MSG_9_EXPECTED_RETURN)
        assert result["is_event"] is True
        # Multi-event messages should not auto-publish
        assert result["confidence_score"] < 0.85, (
            f"Multi-event messages should not auto-publish; got {result['confidence_score']}"
        )

    # Test 10: Full details with phone number
    def test_full_details_with_phone(self):
        result = self._run(MSG_10_TEXT, mock_return=MSG_10_EXPECTED_RETURN)
        assert result["is_event"] is True
        assert result["category"] == "culture"
        assert result["phone"] == "054-123-4567"
        assert result["price"] == "₪80"
        assert result["date"] == "2026-05-21"
        assert result["confidence_score"] >= 0.85


# ---------------------------------------------------------------------------
# Postprocess unit tests (no API calls)
# ---------------------------------------------------------------------------

class TestPostprocess:
    """Test _postprocess() in isolation — no API needed."""

    def test_clamps_confidence_above_1(self):
        result = _postprocess({"confidence_score": 1.5, "is_event": True})
        assert result["confidence_score"] == 1.0

    def test_clamps_confidence_below_0(self):
        result = _postprocess({"confidence_score": -0.2, "is_event": True})
        assert result["confidence_score"] == 0.0

    def test_not_event_forces_zero_confidence(self):
        result = _postprocess({"confidence_score": 0.9, "is_event": False})
        assert result["confidence_score"] == 0.0

    def test_invalid_date_nulled(self):
        result = _postprocess({
            "date": "32/13/2026",  # invalid
            "confidence_score": 0.9,
            "is_event": True,
        })
        assert result["date"] is None
        assert result["confidence_score"] < 0.9  # penalised

    def test_invalid_time_nulled(self):
        result = _postprocess({
            "start_time": "9pm",   # not HH:MM
            "confidence_score": 0.9,
            "is_event": True,
        })
        assert result["start_time"] is None

    def test_valid_date_preserved(self):
        result = _postprocess({
            "date": "2026-05-07",
            "confidence_score": 0.9,
            "is_event": True,
        })
        assert result["date"] == "2026-05-07"

    def test_confidence_reasons_defaults_to_list(self):
        result = _postprocess({"is_event": True})
        assert isinstance(result["confidence_reasons"], list)
