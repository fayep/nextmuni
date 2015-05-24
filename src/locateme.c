#include <pebble.h>

#define KEY_LATITUDE 0
#define KEY_LONGITUDE 1

static char latitude[10] = "lat";
static char longitude[10] = "long";
static Window *window;
static TextLayer *text_layer;

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Select");
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Up");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Down");
}

static void process_dictionary(DictionaryIterator *iterator) {
  Tuple *t = dict_read_first(iterator);
  while (t != NULL) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "%d:%s", t->key, t->value->cstring);
    switch (t->key) {
      case KEY_LATITUDE:
        strncpy(t->value->cstring, latitude, 9);
        break;
      case KEY_LONGITUDE:
        strncpy(t->value->cstring, longitude, 9);
        break;
    }
    t = dict_read_next(iterator);
  }
}

static void inbox_recv_handler(DictionaryIterator *iterator, void *context) {
  static char s_buffer[64];
  process_dictionary(iterator);
  snprintf(s_buffer, sizeof(s_buffer), "%s, %s", latitude, longitude);
  text_layer_set_text(text_layer, s_buffer);
}

static void inbox_drop_handler(AppMessageResult reason, void *context) {
  text_layer_set_text(text_layer, "Dropped");
}

static void inbox_config_handler(void *context) {
  app_message_open(app_message_inbox_size_maximum(),
                   app_message_outbox_size_maximum());
  app_message_set_context(context);
  app_message_register_inbox_received(inbox_recv_handler);
  app_message_register_inbox_dropped(inbox_drop_handler);
}

static void inbox_config_destroy() {
  app_message_deregister_callbacks();
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create((GRect) { .origin = { 0, 72 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer, "Press a button");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
}

static void init(void) {
  window = window_create();
  window_set_click_config_provider(window, click_config_provider);
  inbox_config_handler(window);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);
}

static void deinit(void) {
  inbox_config_destroy();
  window_destroy(window);
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
