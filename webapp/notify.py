from requests import post
from random import choice

SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/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'
EMOJI_LIST = 'bamboo,gift_heart,dolls,school_satchel,mortar_board,flags,fireworks,sparkler,wind_chime,rice_scene,jack_o_lantern,ghost,santa,christmas_tree,gift,bell,no_bell,tanabata_tree,tada,confetti_ball,balloon,crystal_ball,cd,dvd,floppy_disk,camera,video_camera,movie_camera,computer,tv,iphone,phone,telephone,telephone_receiver,pager,fax,minidisc,vhs,sound,speaker,mute,loudspeaker,mega,hourglass,hourglass_flowing_sand,alarm_clock,watch,radio,satellite,loop,mag,mag_right,unlock,lock,lock_with_ink_pen,closed_lock_with_key,key,bulb,flashlight,high_brightness,low_brightness,electric_plug,battery,calling,email,mailbox,postbox,bath,bathtub,shower,toilet,wrench,nut_and_bolt,hammer,seat,moneybag,yen,dollar,pound,euro,credit_card,money_with_wings,e-mail,inbox_tray,outbox_tray,envelope,incoming_envelope,postal_horn,mailbox_closed,mailbox_with_mail,mailbox_with_no_mail,package,door,smoking,bomb,gun,hocho,pill,syringe,page_facing_up,page_with_curl,bookmark_tabs,bar_chart,chart_with_upwards_trend,chart_with_downwards_trend,scroll,clipboard,calendar,date,card_index,file_folder,open_file_folder,scissors,pushpin,paperclip,black_nib,pencil2,straight_ruler,triangular_ruler,closed_book,green_book,blue_book,orange_book,notebook,notebook_with_decorative_cover,ledger,books,bookmark,name_badge,microscope,telescope,newspaper,football,basketball,soccer,baseball,tennis,8ball,rugby_football,bowling,golf,mountain_bicyclist,bicyclist,horse_racing,snowboarder,swimmer,surfer,ski,spades,hearts,clubs,diamonds,gem,ring,trophy,musical_score,musical_keyboard,violin,space_invader,video_game,black_joker,flower_playing_cards,game_die,dart,mahjong,clapper,memo,pencil,book,art,microphone,headphones,trumpet,saxophone,guitar'.split(',')


def post_to_slack(user_email, s3_path):
    msg = {"channel": "#maori-upload-notify",
           "username": "webhookbot",
           "text": ":{}:\nNew successfully uploaded data set\nEmail: {}\nS3 path: {}"
               .format(choice(EMOJI_LIST), user_email, s3_path),
           "icon_emoji": ":new:"}
    post(SLACK_WEBHOOK_URL, json=msg)
