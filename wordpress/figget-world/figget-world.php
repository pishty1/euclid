<?php
/**
 * Plugin Name: Figget World
 * Description: Persistent, action-based Figget-A-Balls world for Euclid. Uses WordPress accounts and a transactional world store.
 * Version: 0.1.0
 * Requires PHP: 8.0
 * Requires at least: 6.0
 */
if (!defined('ABSPATH')) exit;
require_once __DIR__.'/world.php';
function figget_world_install() {
    global $wpdb;
    require_once ABSPATH.'wp-admin/includes/upgrade.php';
    $table=$wpdb->prefix.'figget_world';
    dbDelta("CREATE TABLE $table (
        id bigint(20) unsigned NOT NULL,
        state longtext NOT NULL,
        PRIMARY KEY  (id)
    ) ENGINE=InnoDB ".$wpdb->get_charset_collate().';');
    $wpdb->query($wpdb->prepare("INSERT IGNORE INTO $table (id,state) VALUES (1,%s)",wp_json_encode(Figget_World::fresh(microtime(true)))));
}
register_activation_hook(__FILE__,'figget_world_install');
// admin-ajax authenticates normal WP cookies without requiring a REST nonce first.
// Same-origin browser policy protects the nonce response. No permissive CORS headers.
function figget_world_session() {
    nocache_headers();
    if (!is_user_logged_in()) wp_send_json(['loggedIn'=>false,'login'=>wp_login_url(home_url('/apps/euclid/'))]);
    wp_send_json(['loggedIn'=>true,'nonce'=>wp_create_nonce('wp_rest'),'api'=>rest_url('figget/v1/'),'name'=>wp_get_current_user()->display_name]);
}
add_action('wp_ajax_figget_session','figget_world_session');
add_action('wp_ajax_nopriv_figget_session','figget_world_session');
function figget_world_permission() {
    if (!is_user_logged_in()||!current_user_can('read')) return new WP_Error('figget_login','Sign in to WordPress to enter this world.',['status'=>401]);
    return true;
}
function figget_world_request($request) {
    global $wpdb;
    $table=$wpdb->prefix.'figget_world';
    $params=$request->get_json_params();
    if (!is_array($params)) return new WP_Error('figget_body','Send a JSON object.',['status'=>400]);
    $action=$request->get_route()==='/figget/v1/action';
    if ($action && (!isset($params['request'])||!is_string($params['request'])||!preg_match('/^[a-zA-Z0-9-]{16,64}$/D',$params['request'])||!isset($params['action'])||!is_array($params['action']))) return new WP_Error('figget_input','Invalid action envelope.',['status'=>400]);
    $user=wp_get_current_user();
    try {
        if ($wpdb->query('START TRANSACTION')===false) throw new RuntimeException('Database transaction unavailable.');
        $raw=$wpdb->get_var("SELECT state FROM $table WHERE id=1 FOR UPDATE");
        if (!$raw) throw new RuntimeException('World storage is missing. Reactivate the Figget World plugin.');
        $world=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
        $now=microtime(true);
        Figget_World::advance($world,$now);
        Figget_World::join($world,(int)$user->ID,wp_html_excerpt(wp_strip_all_tags($user->display_name),32,''),$now);
        $message=$action?Figget_World::action($world,(int)$user->ID,$params['action'],$params['request'],$now):'';
        $world['revision']++;
        if ($wpdb->update($table,['state'=>wp_json_encode($world)],['id'=>1],['%s'],['%d'])===false) throw new RuntimeException('World could not be saved.');
        if ($wpdb->query('COMMIT')===false) throw new RuntimeException('World commit failed.');
        $response=new WP_REST_Response(['world'=>Figget_World::snapshot($world,(int)$user->ID,$now),'message'=>$message]);
        $response->header('Cache-Control','no-store, private');
        return $response;
    } catch (Throwable $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('figget_storage','World temporarily unavailable. Please try again.',['status'=>503]);
    }
}
add_action('rest_api_init',function() {
    foreach (['sync','action'] as $route) register_rest_route('figget/v1','/'.$route,['methods'=>'POST','callback'=>'figget_world_request','permission_callback'=>'figget_world_permission']);
});
